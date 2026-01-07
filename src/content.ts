// Utility to generate a unique CSS selector for an element
function getUniqueSelector(el: Element): string {
    if (el.tagName.toLowerCase() === 'body') return 'body';
    if (el.id) return `#${CSS.escape(el.id)}`;

    // Try using specific attributes that might be unique
    const uniqueAttrs = ['data-testid', 'name', 'aria-label'];
    for (const attr of uniqueAttrs) {
        if (el.hasAttribute(attr)) {
            return `${el.tagName.toLowerCase()}[${attr}="${CSS.escape(el.getAttribute(attr)!)}"]`;
        }
    }

    let path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
        let selector = el.nodeName.toLowerCase();
        if (el.id) {
            selector += '#' + CSS.escape(el.id);
            path.unshift(selector);
            break;
        } else {
            let sib: Element | null = el;
            let nth = 1;
            while ((sib = sib.previousElementSibling)) {
                if (sib.nodeName.toLowerCase() === selector) nth++;
            }
            if (nth !== 1) selector += `:nth-of-type(${nth})`;
        }
        path.unshift(selector);
        el = el.parentNode as Element;
    }
    return path.join(' > ');
}

let isMirroring = false;
let isReplaying = false; // Flag to prevent infinite loops (Event A triggers B, B triggers A)

declare global {
    interface Window {
        originalTitle?: string;
    }
}

// Check if we are running inside the extension dashboard
const checkIsManaged = async () => {
    // 1. Check window.name for config
    if (window.name && window.name.startsWith('SD_CONF:')) {
        const injectScript = () => {
            try {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('src/inject.js');
                script.onload = function () {
                    script.remove(); // Clean up
                };
                (document.head || document.documentElement).appendChild(script);
                console.log("SiteDevice: Injected main world script");
            } catch (e) {
                console.error("SiteDevice: Injection failed", e);
            }
        };

        // Execute injection
        injectScript();

        // MARK TITLE FOR CDP TARGET DISCOVERY
        let deviceId = '';
        try {
            const config = JSON.parse(window.name.substring(8));
            deviceId = config.id;
            const idTag = `[SD:${config.id}]`;

            const markTitle = () => {
                if (document.title && !document.title.includes(idTag)) {
                    document.title = document.title + " " + idTag;
                } else if (!document.title) {
                    document.title = idTag;
                }
            };

            markTitle();

            // Watch for title changes (SPA)
            const titleObserver = new MutationObserver(markTitle);
            const titleEl = document.querySelector('title');
            if (titleEl) {
                titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true });
            } else {
                // If no title element yet, watch head
                const headObserver = new MutationObserver(() => {
                    if (document.querySelector('title')) {
                        headObserver.disconnect();
                        const t = document.querySelector('title');
                        if (t) titleObserver.observe(t, { childList: true, characterData: true, subtree: true });
                        markTitle();
                    }
                });
                if (document.head) headObserver.observe(document.head, { childList: true });
            }
        } catch (e) { console.error("SiteDevice Title Mark Error", e); }

        try {
            // We send a ping to background to ask if we are inside the dashboard tab
            const response = await chrome.runtime.sendMessage({ type: "CHECK_IS_MANAGED" });
            if (response && response.isManaged) {
                console.log("SiteDevice: Managed Frame Detected. Enabling mirroring.");
                enableMirroring(deviceId);
            }
        } catch (e) {
            // Error implies extension context might be invalid or standard web page
        }
    }
};

function enableMirroring(deviceId?: string) {
    if (isMirroring) return;
    isMirroring = true;

    // SCROLL LOOP (RAF Strategy for Fluidity)
    let isTicking = false;

    window.addEventListener('scroll', () => {
        if (isReplaying) return;

        if (!isTicking) {
            window.requestAnimationFrame(() => {
                const currentX = window.scrollX;
                const currentY = window.scrollY;
                const docWidth = document.documentElement.scrollWidth;
                const docHeight = document.documentElement.scrollHeight;
                const winWidth = window.innerWidth;
                const winHeight = window.innerHeight;

                const scrollX = currentX / (docWidth - winWidth || 1);
                const scrollY = currentY / (docHeight - winHeight || 1);

                const payload = {
                    scrollX,
                    scrollY,
                    pixelX: currentX,
                    pixelY: currentY,
                    docWidth,
                    docHeight
                };
                //@ts-ignore
                if (deviceId) payload.deviceId = deviceId;

                chrome.runtime.sendMessage({
                    type: 'EVENT_SCROLL',
                    payload
                });

                isTicking = false;
            });
            isTicking = true;
        }
    }, { passive: true });

    // CLICK
    document.addEventListener('click', (e) => {
        if (isReplaying || !e.target) return;
        const target = e.target as Element;
        // If it's a link, we might want to handle navigation specifically
        const anchor = target.closest('a');
        if (anchor && anchor.href) {
            // Let the click happen, but also notify navigation intent?
            // Actually, if we sync click, the other frame will click the link and navigate too.
            // So just sync click.
        }

        const selector = getUniqueSelector(target);
        chrome.runtime.sendMessage({
            type: 'EVENT_CLICK',
            payload: { selector }
        });
    }, true); // Capture phase

    // INPUT
    document.addEventListener('input', (e) => {
        if (isReplaying || !e.target) return;
        const target = e.target as Element;
        const selector = getUniqueSelector(target);
        const value = (target as HTMLInputElement).value;

        chrome.runtime.sendMessage({
            type: 'EVENT_INPUT',
            payload: { selector, value }
        });
    }, true);

    // LISTEN for messages
    chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
        if (msg.type === 'REPLAY_SCROLL') {
            isReplaying = true;
            const { scrollX, scrollY } = msg.payload;
            const targetX = scrollX * (document.documentElement.scrollWidth - window.innerWidth);
            const targetY = scrollY * (document.documentElement.scrollHeight - window.innerHeight);
            window.scrollTo({
                top: targetY,
                left: targetX,
                behavior: 'auto' // Instant
            });
            // Extended safety timeout to prevent jumpy echo
            setTimeout(() => isReplaying = false, 100);
        } else if (msg.type === 'REPLAY_CLICK') {
            isReplaying = true;
            const el = document.querySelector(msg.payload.selector) as HTMLElement;
            if (el) {
                // Focus if needed
                el.focus();
                el.click();
            }
            setTimeout(() => isReplaying = false, 50);
        } else if (msg.type === 'REPLAY_INPUT') {
            isReplaying = true;
            const el = document.querySelector(msg.payload.selector) as HTMLInputElement;
            if (el) {
                el.value = msg.payload.value;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
            setTimeout(() => isReplaying = false, 50);
        } else if (msg.type === 'NAVIGATE') {
            window.location.href = msg.payload.url;
        } else if (msg.type === 'GET_PAGE_DIMS') {
            try {
                if (window.name && window.name.startsWith('SD_CONF:')) {
                    const config = JSON.parse(window.name.substring(8));
                    if (config.id === msg.targetDeviceId) {
                        // Robust Height Calculation
                        const body = document.body;
                        const html = document.documentElement;
                        const height = Math.max(
                            body.scrollHeight, body.offsetHeight,
                            html.clientHeight, html.scrollHeight, html.offsetHeight
                        );

                        _sendResponse({
                            scrollWidth: document.documentElement.scrollWidth,
                            scrollHeight: height,
                            clientWidth: document.documentElement.clientWidth,
                            clientHeight: document.documentElement.clientHeight,
                            pixelRatio: window.devicePixelRatio
                        });
                    }
                }
            } catch (e) { console.error(e); }
        } else if (msg.type === 'CMD_NAV_BACK') {
            window.history.back();
        } else if (msg.type === 'CMD_NAV_FORWARD') {
            window.history.forward();
        }
    });

    // URL MONITOR (SPA Support)
    let lastUrl = location.href;
    // Initial Notify
    chrome.runtime.sendMessage({ type: 'EVENT_NAVIGATED', payload: { url: lastUrl } });

    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            chrome.runtime.sendMessage({ type: 'EVENT_NAVIGATED', payload: { url: lastUrl } });
        }
    }, 500);
}

checkIsManaged();
