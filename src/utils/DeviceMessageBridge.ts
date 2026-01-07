// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MessagePayload = any

/**
 * Handles bidirectional messaging between a device iframe and the extension
 */
export class DeviceMessageBridge {
    private deviceId: string
    private listeners: Map<string, Set<(payload: MessagePayload) => void>> = new Map()

    constructor(deviceId: string) {
        this.deviceId = deviceId
        this.initializeListeners()
    }

    /**
     * Register a listener for a specific message type
     */
    on(type: string, handler: (payload: MessagePayload) => void): () => void {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set())
        }
        this.listeners.get(type)!.add(handler)

        // Return unsubscribe function
        return () => {
            this.listeners.get(type)?.delete(handler)
        }
    }

    /**
     * Send message to background script
     */
    sendToBackground(type: string, payload: MessagePayload): void {
        chrome.runtime.sendMessage({
            type,
            payload,
            sourceDeviceId: this.deviceId
        }).catch(e => {
            console.error(`[Bridge] Failed to send message: ${type}`, e)
        })
    }

    /**
     * Send message to peer frames (other devices)
     */
    async sendToPeers(type: string, payload: MessagePayload): Promise<void> {
        const tab = await chrome.tabs.getCurrent()
        if (!tab?.id) return

        chrome.webNavigation.getAllFrames({ tabId: tab.id }, (frames) => {
            frames?.forEach(frame => {
                if (frame.frameId === 0) return // Skip main frame

                chrome.tabs.sendMessage(
                    tab.id!,
                    {
                        type,
                        payload,
                        sourceDeviceId: this.deviceId
                    },
                    { frameId: frame.frameId }
                ).catch(() => {
                    // Silently ignore if frame no longer exists
                })
            })
        })
    }

    /**
     * Broadcast to both background and peers
     */
    async broadcast(type: string, payload: MessagePayload): Promise<void> {
        this.sendToBackground(type, payload)
        await this.sendToPeers(type, payload)
    }

    /**
     * Initialize system listeners (called on construction)
     */
    private initializeListeners(): void {
        chrome.runtime.onMessage.addListener((message) => {
            const { type, payload } = message
            if (!type) return

            // Call registered listeners
            const handlers = this.listeners.get(type)
            if (handlers) {
                handlers.forEach(handler => {
                    try {
                        handler(payload)
                    } catch (e) {
                        console.error(`[Bridge] Handler error for ${type}`, e)
                    }
                })
            }
        })
    }
}

/**
 * Get the device ID from the iframe config
 */
export function getDeviceIdFromConfig(): string | null {
    try {
        if (window.name && window.name.startsWith('SD_CONF:')) {
            const config = JSON.parse(window.name.substring(8))
            return config.id
        }
    } catch (e) {
        console.error('[DeviceConfig] Failed to parse config', e)
    }
    return null
}
