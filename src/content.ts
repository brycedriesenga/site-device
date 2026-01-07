import { DeviceMessageBridge, getDeviceIdFromConfig } from './utils/DeviceMessageBridge'
import { DeviceEventMirror } from './utils/DeviceEventMirror'

const deviceId = getDeviceIdFromConfig()

if (!deviceId) {
    console.log('[SiteDevice] Not a managed device iframe')
} else {
    console.log(`[SiteDevice] Initialized device: ${deviceId}`)

    // Inject main world script
    injectMainWorldScript()

    // Mark title with device ID
    markTitle(deviceId)

    // Check if this is a managed frame (inside extension dashboard)
    checkIfManaged(deviceId)
}

/**
 * Check if we are running inside the extension dashboard
 */
async function checkIfManaged(deviceId: string): Promise<void> {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'CHECK_IS_MANAGED' })
        if (response && response.isManaged) {
            console.log('[SiteDevice] Managed frame detected. Enabling mirroring.')
            enableMirroring(deviceId)
        }
    } catch {
        // Error implies extension context might be invalid or standard web page
    }
}

/**
 * Enable event mirroring and message handling
 */
function enableMirroring(deviceId: string): void {
    // Initialize message bridge
    const bridge = new DeviceMessageBridge(deviceId)

    // Initialize event mirroring
    const mirror = new DeviceEventMirror(bridge)
    mirror.mirrorScroll()
    mirror.mirrorClicks()
    mirror.mirrorInput()

    // Listen for navigation commands
    bridge.on('NAVIGATE', (payload) => {
        window.location.href = payload.url
    })

    bridge.on('CMD_NAV_BACK', () => {
        window.history.back()
    })

    bridge.on('CMD_NAV_FORWARD', () => {
        window.history.forward()
    })

    // Handle page dimensions request (special case - needs sendResponse)
    // This uses a separate listener because it requires synchronous response
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg.type === 'GET_PAGE_DIMS' && msg.targetDeviceId === deviceId) {
            try {
                const body = document.body
                const html = document.documentElement
                const height = Math.max(
                    body.scrollHeight, body.offsetHeight,
                    html.clientHeight, html.scrollHeight, html.offsetHeight
                )

                sendResponse({
                    scrollWidth: document.documentElement.scrollWidth,
                    scrollHeight: height,
                    clientWidth: document.documentElement.clientWidth,
                    clientHeight: document.documentElement.clientHeight,
                    pixelRatio: window.devicePixelRatio
                })
            } catch (e) {
                console.error('[SiteDevice] Failed to get page dimensions', e)
            }
            return true // Keep channel open for async response
        }
    })

    // URL monitoring for SPA navigation
    let lastUrl = location.href
    bridge.sendToBackground('EVENT_NAVIGATED', { url: lastUrl })

    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href
            bridge.sendToBackground('EVENT_NAVIGATED', { url: lastUrl })
        }
    }, 500)
}

/**
 * Inject script into main world for browser APIs access
 */
function injectMainWorldScript(): void {
    try {
        const script = document.createElement('script')
        script.src = chrome.runtime.getURL('src/inject.js')
        script.onload = () => script.remove()
        ;(document.head || document.documentElement).appendChild(script)
        console.log('[SiteDevice] Injected main world script')
    } catch (e) {
        console.error('[SiteDevice] Failed to inject script', e)
    }
}

/**
 * Mark page title with device ID for CDP discovery
 */
function markTitle(deviceId: string): void {
    const idTag = `[SD:${deviceId}]`

    const updateTitle = () => {
        if (document.title && !document.title.includes(idTag)) {
            document.title = `${document.title} ${idTag}`
        } else if (!document.title) {
            document.title = idTag
        }
    }

    updateTitle()

    // Watch for title changes (SPA navigation)
    const titleEl = document.querySelector('title')
    if (titleEl) {
        const observer = new MutationObserver(updateTitle)
        observer.observe(titleEl, { childList: true, characterData: true, subtree: true })
    } else {
        // Watch head for title creation
        const headObserver = new MutationObserver(() => {
            const title = document.querySelector('title')
            if (title) {
                headObserver.disconnect()
                const titleObserver = new MutationObserver(updateTitle)
                titleObserver.observe(title, { childList: true, characterData: true, subtree: true })
                updateTitle()
            }
        })
        if (document.head) {
            headObserver.observe(document.head, { childList: true })
        }
    }
}
