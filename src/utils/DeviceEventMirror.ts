import { DeviceMessageBridge } from './DeviceMessageBridge'

/**
 * Handles event mirroring between device iframes
 * Prevents infinite loops via replay flag
 */
export class DeviceEventMirror {
    private isReplaying = false
    private bridge: DeviceMessageBridge

    constructor(bridge: DeviceMessageBridge) {
        this.bridge = bridge
    }

    /**
     * Start mirroring scroll events
     */
    mirrorScroll(): void {
        let isTicking = false

        window.addEventListener('scroll', () => {
            if (this.isReplaying) return

            if (!isTicking) {
                window.requestAnimationFrame(() => {
                    const currentX = window.scrollX
                    const currentY = window.scrollY
                    const docWidth = document.documentElement.scrollWidth
                    const docHeight = document.documentElement.scrollHeight
                    const winWidth = window.innerWidth
                    const winHeight = window.innerHeight

                    const scrollX = currentX / (docWidth - winWidth || 1)
                    const scrollY = currentY / (docHeight - winHeight || 1)

                    this.bridge.sendToBackground('EVENT_SCROLL', {
                        scrollX,
                        scrollY,
                        pixelX: currentX,
                        pixelY: currentY,
                        docWidth,
                        docHeight
                    })

                    isTicking = false
                })
                isTicking = true
            }
        }, { passive: true })

        // Listen for scroll replays from other devices
        this.bridge.on('REPLAY_SCROLL', (payload) => {
            this.isReplaying = true
            const { scrollX, scrollY } = payload
            const targetX = scrollX * (document.documentElement.scrollWidth - window.innerWidth)
            const targetY = scrollY * (document.documentElement.scrollHeight - window.innerHeight)
            window.scrollTo({
                top: targetY,
                left: targetX,
                behavior: 'auto'
            })
            // Extended safety timeout to prevent jumpy echo
            setTimeout(() => {
                this.isReplaying = false
            }, 100)
        })
    }

    /**
     * Start mirroring click events
     */
    mirrorClicks(): void {
        document.addEventListener('click', (e) => {
            if (this.isReplaying) return

            const target = e.target as Element
            if (!target) return

            // Get unique selector for clicked element
            const selector = this.getUniqueSelector(target)

            this.bridge.sendToBackground('EVENT_CLICK', {
                selector,
                x: e.clientX,
                y: e.clientY
            })
        }, true)

        // Listen for click replays
        this.bridge.on('REPLAY_CLICK', (payload) => {
            this.isReplaying = true
            try {
                const element = document.querySelector(payload.selector) as HTMLElement
                if (element) {
                    element.focus()
                    element.click()
                }
            } catch (e) {
                console.error('[Mirror] Failed to replay click', e)
            }
            setTimeout(() => {
                this.isReplaying = false
            }, 50)
        })
    }

    /**
     * Start mirroring input events
     */
    mirrorInput(): void {
        document.addEventListener('input', (e) => {
            if (this.isReplaying) return

            const target = e.target as HTMLInputElement | HTMLTextAreaElement
            if (!target) return

            const selector = this.getUniqueSelector(target)
            const value = target.value

            this.bridge.sendToBackground('EVENT_INPUT', {
                selector,
                value
            })
        }, true)

        // Listen for input replays
        this.bridge.on('REPLAY_INPUT', (payload) => {
            this.isReplaying = true
            try {
                const element = document.querySelector(payload.selector) as HTMLInputElement
                if (element) {
                    element.value = payload.value
                    element.dispatchEvent(new Event('input', { bubbles: true }))
                    element.dispatchEvent(new Event('change', { bubbles: true }))
                }
            } catch (e) {
                console.error('[Mirror] Failed to replay input', e)
            }
            setTimeout(() => {
                this.isReplaying = false
            }, 50)
        })
    }

    /**
     * Get unique CSS selector for an element
     */
    private getUniqueSelector(el: Element): string {
        if (el.tagName.toLowerCase() === 'body') return 'body'
        if (el.id) return `#${CSS.escape(el.id)}`

        // Try data attributes
        const uniqueAttrs = ['data-testid', 'name', 'aria-label']
        for (const attr of uniqueAttrs) {
            if (el.hasAttribute(attr)) {
                const value = el.getAttribute(attr)!
                return `${el.tagName.toLowerCase()}[${attr}="${CSS.escape(value)}"]`
            }
        }

        // Build path from root
        const path = []
        let current: Element | null = el
        while (current && current.nodeType === Node.ELEMENT_NODE) {
            let selector = current.nodeName.toLowerCase()
            if (current.id) {
                selector += `#${CSS.escape(current.id)}`
                path.unshift(selector)
                break
            } else {
                let sibling: Element | null = current
                let nth = 1
                while ((sibling = sibling.previousElementSibling)) {
                    if (sibling.nodeName.toLowerCase() === selector) nth++
                }
                if (nth !== 1) selector += `:nth-of-type(${nth})`
            }
            path.unshift(selector)
            current = current.parentElement
        }

        return path.join(' > ')
    }
}
