// This script runs in the MAIN world (the page's context)
// It reads the configuration we stashed in window.name and applies overrides

(function () {
    try {
        // 1. Parse configuration from window.name
        // Format: "SD_CONF:{...}"
        const name = window.name;
        if (!name || !name.startsWith('SD_CONF:')) return;

        const configStr = name.substring('SD_CONF:'.length).trim();
        const config = JSON.parse(configStr);

        console.log('[SiteDevice] Applying emulation in Main World:', config);

        // 2. Storage Polyfill (Fixes Crash in Isolation Mode)
        // Many sites crash if localStorage/sessionStorage throws a SecurityError (Sandboxed)
        // We replace them with in-memory polyfills.
        try {
            // Helper class to mimic Storage interface
            class MemoryStorage {
                constructor() { this.store = new Map(); }
                getItem(key) { return this.store.has(key) ? this.store.get(key) : null; }
                setItem(key, value) { this.store.set(key, String(value)); }
                removeItem(key) { this.store.delete(key); }
                clear() { this.store.clear(); }
                get length() { return this.store.size; }
                key(index) { return Array.from(this.store.keys())[index] || null; }
            }

            // Only polyfill if we expect them to be broken (Isolation Mode = Sandboxed)
            // But checking for 'sandboxed' via JS is hard.
            // Safest bet: Attempt to access. If it throws, or if config says isolation, we patch.

            // Actually, we can just forcefully override them. The site won't know the difference.
            // Using Object.defineProperty on window allows us to shadow the native properties.
            const localStoragePoly = new MemoryStorage();
            const sessionStoragePoly = new MemoryStorage();

            Object.defineProperty(window, 'localStorage', {
                value: localStoragePoly,
                configurable: true,
                enumerable: true,
                writable: true
            });

            Object.defineProperty(window, 'sessionStorage', {
                value: sessionStoragePoly,
                configurable: true,
                enumerable: true,
                writable: true
            });
            console.log('[SiteDevice] Storage APIs polyfilled for Sandbox compatibility');

        } catch (e) {
            console.warn('[SiteDevice] Failed to polyfill storage:', e);
        }

        // 3. Override Navigator Properties
        const override = (obj, prop, value) => {
            Object.defineProperty(obj, prop, {
                get: () => value,
                configurable: true
            });
        };

        if (config.w && config.h) {
            console.log(`[SiteDevice] Spoofing Screen: ${config.w}x${config.h}`);

            // Override window properties
            override(window, 'outerWidth', config.w);
            override(window, 'outerHeight', config.h);
            override(window, 'innerWidth', config.w);
            override(window, 'innerHeight', config.h);
            override(window, 'devicePixelRatio', config.type === 'mobile' ? 3 : 1);

            // Override Screen properties
            // We can't easily replace window.screen, but we can try to shadow it or define properties
            const screenProps = {
                width: config.w,
                height: config.h,
                availWidth: config.w,
                availHeight: config.h,
                availLeft: 0,
                availTop: 0,
                colorDepth: 24,
                pixelDepth: 24
            };

            // Attempt to override individual properties on the screen object prototype or instance
            for (const [key, val] of Object.entries(screenProps)) {
                try {
                    Object.defineProperty(window.screen, key, { get: () => val, configurable: true });
                } catch (e) {
                    // console.warn(`[SiteDevice] Failed to override screen.${key}`, e);
                }
            }
        }

        // 3b. Mobile Feature Detection Overrides
        if (config.type === 'mobile' || config.type === 'tablet') {
            // Legacy Orientation Support
            if (typeof window.orientation === 'undefined') {
                override(window, 'orientation', 0);
                window.onorientationchange = null; // implies support
            }

            // Touch Support
            if (typeof window.TouchEvent === 'undefined') {
                window.TouchEvent = function TouchEvent() { };
            }
            if (typeof window.ontouchstart === 'undefined') {
                window.ontouchstart = null;
            }

            // CSS Media Feature Mocking (matchMedia)
            // Force (pointer: coarse) and (hover: none) to simulate touch screen
            const nativeMatchMedia = window.matchMedia;
            window.matchMedia = function (query) {
                const lowerQuery = query.toLowerCase();

                // If asking about interaction type
                if (lowerQuery.includes('pointer: coarse') || lowerQuery.includes('any-pointer: coarse')) {
                    const result = nativeMatchMedia.call(window, query);
                    Object.defineProperty(result, 'matches', { get: () => true }); // Force True
                    return result;
                }
                if (lowerQuery.includes('hover: hover') || lowerQuery.includes('any-hover: hover')) {
                    const result = nativeMatchMedia.call(window, query);
                    Object.defineProperty(result, 'matches', { get: () => false }); // Force False (No hover on touch)
                    return result;
                }

                return nativeMatchMedia.call(window, query);
            };
        }

        if (config.ua) {
            override(navigator, 'userAgent', config.ua);
            override(navigator, 'appVersion', config.ua.replace(/^[^/]+\//, '')); // Approximate
        }

        // 5. Emulated Viewport Scaling (The "Modern Override" Logic)
        // The user verified that forcing the viewport to the device width (e.g. 393px) fixes the layout,
        // even if the site originally requested 321px. 
        // We will intercept and OVERRIDE the viewport meta tag to match our device width.
        if (config.type === 'mobile' || config.type === 'tablet') {
            const enforceDeviceWidthHelpers = () => {
                try {
                    const targetWidth = config.w || window.innerWidth;
                    let viewportMeta = document.querySelector('meta[name="viewport"]');

                    // If no meta exists, create one
                    if (!viewportMeta) {
                        viewportMeta = document.createElement('meta');
                        viewportMeta.name = 'viewport';
                        document.head.appendChild(viewportMeta);
                    }

                    const currentContent = viewportMeta.getAttribute('content') || '';
                    // We want to force "width=DEVICE_WIDTH".
                    // If the site has "width=321", we replace it with "width=393" (or whatever config.w is).
                    const newContent = `width=${targetWidth}, initial-scale=1, maximum-scale=1, user-scalable=0`;

                    if (currentContent !== newContent) {
                        console.log(`[SiteDevice] Overriding viewport: "${currentContent}" -> "${newContent}"`);
                        viewportMeta.setAttribute('content', newContent);

                        // Also force min-width just in case CSS needs a nudge
                        if (document.documentElement) {
                            document.documentElement.style.minWidth = `${targetWidth}px`;
                        }
                    }

                    // Tell the parent frame we are officially at this width (no scaling needed)
                    window.parent.postMessage({
                        type: 'SD_UPDATE_VIEWPORT',
                        deviceId: config.id,
                        width: targetWidth // This effectively resets any scaling in DeviceFrame
                    }, '*');

                } catch (e) {
                    // console.warn('[SiteDevice] Viewport override failed', e);
                }
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', enforceDeviceWidthHelpers);
            } else {
                enforceDeviceWidthHelpers();
            }

            // Aggressive Observer: If the site tries to put "width=321" back, we overwrite it again.
            const observer = new MutationObserver((mutations) => {
                enforceDeviceWidthHelpers();
            });
            observer.observe(document.head || document.documentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['content']
            });
        }

        if (config.type === 'mobile' || config.type === 'tablet') {
            const isAndroid = config.ua.includes('Android');
            override(navigator, 'platform', isAndroid ? 'Linux armv8l' : (config.type === 'mobile' ? 'iPhone' : 'iPad'));
            override(navigator, 'maxTouchPoints', 5);
            override(navigator, 'ontouchstart', null); // Presence implies touch support
        } else {
            // Desktop defaults
            override(navigator, 'maxTouchPoints', 0);
            // Don't necessarily override platform for desktop unless needed, but maybe sync with UA?
            if (config.ua.includes('Mac')) override(navigator, 'platform', 'MacIntel');
            else if (config.ua.includes('Win')) override(navigator, 'platform', 'Win32');
        }

        // 3. Client Hints Mock
        if (config.ch) {
            const chData = {
                platform: config.ch.platform,
                mobile: config.ch.mobile,
                brands: config.ch.brands,
                getHighEntropyValues: async (hints) => {
                    return {
                        architecture: 'x86',
                        bitness: '64',
                        model: '',
                        platformVersion: '15.0',
                        uaFullVersion: '110.0.0.0',
                        ...config.ch
                    };
                }
            };
            override(navigator, 'userAgentData', chData);
        }

        // 4. URL Parameter Enforcement (The Watchdog)
        if (config.id) {
            const currentUrl = new URL(window.location.href);
            const paramName = '__sd_id';
            const retryParamName = '__sd_retry';

            // If the param is missing or wrong
            if (currentUrl.searchParams.get(paramName) !== config.id) {

                // Determine retry count
                let retryCount = 0;

                // Try reading from URL first (works in sandbox)
                const urlRetry = currentUrl.searchParams.get(retryParamName);
                if (urlRetry) {
                    retryCount = parseInt(urlRetry, 10);
                } else {
                    // Fallback to sessionStorage if available (non-sandboxed)
                    try {
                        const baseKey = currentUrl.pathname; // simplified key
                        const storageRetry = sessionStorage.getItem(`sd_retry_${baseKey}`);
                        if (storageRetry) retryCount = parseInt(storageRetry, 10);
                    } catch (e) {
                        // sessionStorage blocked (sandbox), rely on valid retryCount=0 from above
                    }
                }

                if (retryCount < 3) {
                    console.log('[SiteDevice] Enforcing ID param for DNR:', config.id);
                    currentUrl.searchParams.set(paramName, config.id);
                    currentUrl.searchParams.set(retryParamName, (retryCount + 1).toString());

                    // Use replace to avoid history pollution
                    window.location.replace(currentUrl.toString());
                } else {
                    console.warn('[SiteDevice] Gave up enforcing ID due to potential loop');
                }
            } else {
                // Clean up retry param if present
                if (currentUrl.searchParams.has(retryParamName)) {
                    const cleanUrl = new URL(currentUrl.toString());
                    cleanUrl.searchParams.delete(retryParamName);
                    // We use replaceState here to clean URL without reloading
                    window.history.replaceState({}, '', cleanUrl.toString());
                }
                // Try clearing sessionStorage if we used it
                try {
                    sessionStorage.removeItem(`sd_retry_${currentUrl.pathname}`);
                } catch (e) { }
            }
        }

    } catch (e) {
        console.error('[SiteDevice] Emulation failed', e);
    }

    // Diagnostic Logging for User
    setTimeout(() => {
        console.group('[SiteDevice] Emulation Diagnositcs');
        console.log('window.innerWidth:', window.innerWidth);
        console.log('window.outerWidth:', window.outerWidth);
        console.log('screen.width:', window.screen.width);
        console.log('screen.availWidth:', window.screen.availWidth);
        console.log('document.body.clientWidth:', document.body ? document.body.clientWidth : 'N/A');
        console.log('navigator.userAgent:', navigator.userAgent);
        console.groupEnd();
    }, 500);

})();
