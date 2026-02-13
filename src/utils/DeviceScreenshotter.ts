import { Editor, type TLShapeId } from 'tldraw'

export type ScreenshotType = 'viewport-1x' | 'viewport-2x' | 'full-page' | 'full-page-2x'

export interface ScreenshotOptions {
    type: ScreenshotType
}

/**
 * Handles device screenshot capture with support for viewport and full-page modes.
 * 
 * APPROACH:
 * 1. For viewport screenshots: Center the device in view and capture once
 * 2. For full-page: Resize device to full height, capture, restore
 * 
 * This avoids complex tiling and camera movements that were causing issues.
 */
export class DeviceScreenshotter {
    private editor: Editor

    constructor(editor: Editor) {
        this.editor = editor
    }

    /**
     * Capture a device screenshot.
     */
    async capture(deviceShapeId: string, options: ScreenshotOptions): Promise<void> {
        const shapeId = deviceShapeId as TLShapeId
        const shape = this.editor.getShape(shapeId)
        if (!shape || shape.type !== 'device') {
            throw new Error(`Device shape not found: ${deviceShapeId}`)
        }

        const originalCamera = { ...this.editor.getCamera() }
        const selectedIds = this.editor.getSelectedShapeIds()
        const originalHeight = (shape.props as { h: number }).h
        const deviceW = (shape.props as { w: number }).w
        const deviceH = originalHeight
        const scaleFactor = options.type.includes('2x') ? 2 : 1
        const isFullPage = options.type.startsWith('full-page')
        let captureHeight = deviceH
        let heightChanged = false

        try {
            // Hide UI elements
            this.hideUI()
            this.editor.selectNone()
            
            // Wait for UI to hide
            await this.wait(300)

            if (isFullPage) {
                const fullHeight = await this.getPageHeight(deviceShapeId)
                if (fullHeight && fullHeight > deviceH) {
                    captureHeight = fullHeight
                    heightChanged = true
                    // Expand device for full-page capture
                    this.editor.updateShape({
                        id: shapeId,
                        type: 'device',
                        props: { h: fullHeight },
                    })
                    await this.wait(500) // Wait for iframe to resize
                }
            }

            // Position camera to center the device in viewport
            const bounds = this.editor.getShapePageBounds(shapeId)
            if (!bounds) throw new Error('Failed to get device bounds')

            // Calculate camera position to center device at desired zoom
            const viewportW = window.innerWidth
            const viewportH = window.innerHeight
            
            // Camera position: center device, apply scale
            const camX = bounds.x + bounds.w / 2 - (viewportW / 2) / scaleFactor
            const camY = bounds.y + bounds.h / 2 - (viewportH / 2) / scaleFactor

            this.editor.setCamera({ x: camX, y: camY, z: scaleFactor })
            
            // Wait for render
            await this.waitForRender()
            await this.wait(300) // Extra wait for iframe content

            // Create canvas for output
            const canvas = document.createElement('canvas')
            canvas.width = deviceW * scaleFactor
            canvas.height = captureHeight * scaleFactor
            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error('Failed to get canvas context')

            // Capture the visible tab
            const dataUrl = await this.captureTabImage()
            if (!dataUrl) {
                throw new Error('Failed to capture tab image')
            }

            // Load captured image
            const image = await this.loadImage(dataUrl)

            // Find where the device iframe is on screen
            const iframe = document.querySelector(`iframe[name*="${deviceShapeId}"]`) as HTMLIFrameElement | null
            if (!iframe) {
                throw new Error('Device iframe not found on screen')
            }

            const iframeRect = iframe.getBoundingClientRect()
            const dpr = window.devicePixelRatio

            // Calculate source coordinates from the captured image
            // The captured image is at DPR resolution
            const sourceX = iframeRect.left * dpr
            const sourceY = iframeRect.top * dpr
            const sourceW = iframeRect.width * dpr
            const sourceH = Math.min(iframeRect.height * dpr, captureHeight * scaleFactor * dpr)

            // Draw the device portion onto the canvas
            ctx.drawImage(
                image,
                sourceX,
                sourceY,
                sourceW,
                sourceH,
                0,
                0,
                deviceW * scaleFactor,
                Math.min(iframeRect.height * scaleFactor, captureHeight * scaleFactor)
            )

            // For full-page, capture additional sections if device is taller than viewport
            if (isFullPage && captureHeight > iframeRect.height) {
                await this.captureFullPageSections(
                    canvas, 
                    ctx, 
                    deviceShapeId, 
                    captureHeight, 
                    iframeRect.height, 
                    deviceW,
                    scaleFactor,
                    camX,
                    camY
                )
            }

            // Download the image
            const fileName = `${(shape.props as { name: string }).name}-${options.type}.png`
            this.downloadImage(canvas, fileName)

        } finally {
            // Restore device height if changed
            if (heightChanged) {
                this.editor.updateShape({
                    id: shapeId,
                    type: 'device',
                    props: { h: originalHeight },
                })
            }

            // Restore camera and selection
            this.editor.setCamera(originalCamera)
            this.editor.setSelectedShapes(selectedIds)
            this.showUI()
        }
    }

    /**
     * Capture additional sections for full-page screenshots.
     * Scrolls the camera down and captures the remaining content.
     */
    private async captureFullPageSections(
        _canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        deviceShapeId: string,
        totalHeight: number,
        viewportHeight: number,
        deviceW: number,
        scaleFactor: number,
        baseCamX: number,
        baseCamY: number
    ): Promise<void> {
        const sections = Math.ceil((totalHeight - viewportHeight) / viewportHeight)
        
        for (let i = 1; i <= sections; i++) {
            // Move camera down by viewport height
            const offsetY = i * viewportHeight
            this.editor.setCamera({ 
                x: baseCamX, 
                y: baseCamY + offsetY / scaleFactor, 
                z: scaleFactor 
            })
            
            await this.waitForRender()
            await this.wait(300)

            const dataUrl = await this.captureTabImage()
            if (!dataUrl) continue

            const image = await this.loadImage(dataUrl)
            const iframe = document.querySelector(`iframe[name*="${deviceShapeId}"]`) as HTMLIFrameElement | null
            if (!iframe) continue

            const iframeRect = iframe.getBoundingClientRect()
            const dpr = window.devicePixelRatio

            // Calculate how much of the remaining height to capture
            const remainingHeight = totalHeight - (i * viewportHeight)
            const captureH = Math.min(iframeRect.height, Math.max(0, remainingHeight))

            if (captureH <= 0) break

            const sourceY = iframeRect.top * dpr
            const sourceH = captureH * dpr

            // Draw this section below the previous ones
            ctx.drawImage(
                image,
                iframeRect.left * dpr,
                sourceY,
                iframeRect.width * dpr,
                sourceH,
                0,
                i * viewportHeight * scaleFactor,
                deviceW * scaleFactor,
                captureH * scaleFactor
            )
        }
    }

    /**
     * Get page scrollHeight from iframe.
     */
    private async getPageHeight(deviceShapeId: string): Promise<number | null> {
        const tab = await chrome.tabs.getCurrent()
        const tabId = tab?.id
        if (!tabId) return null

        return new Promise((resolve) => {
            let resolved = false

            chrome.tabs.sendMessage(
                tabId,
                { type: 'GET_PAGE_DIMS', targetDeviceId: deviceShapeId },
                (resp: { scrollHeight?: number } | undefined) => {
                    if (resolved) return
                    resolved = true

                    if (chrome.runtime.lastError) {
                        resolve(null)
                        return
                    }

                    resolve(resp?.scrollHeight ?? null)
                }
            )

            setTimeout(() => {
                if (resolved) return
                resolved = true
                resolve(null)
            }, 1000)
        })
    }

    /**
     * Capture visible tab area as data URL.
     */
    private captureTabImage(): Promise<string> {
        return new Promise((resolve) => {
            chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
                resolve(dataUrl || '')
            })
        })
    }

    /**
     * Load image from data URL.
     */
    private loadImage(src: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = src
        })
    }

    /**
     * Download canvas as PNG file.
     */
    private downloadImage(canvas: HTMLCanvasElement, filename: string): void {
        canvas.toBlob((blob) => {
            if (!blob) return

            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            a.click()

            setTimeout(() => URL.revokeObjectURL(url), 500)
        })
    }

    /**
     * Hide UI for clean screenshot.
     */
    private hideUI(): void {
        document.body.classList.add('screenshot-mode')
    }

    /**
     * Show UI after screenshot.
     */
    private showUI(): void {
        document.body.classList.remove('screenshot-mode')
    }

    /**
     * Wait for specified milliseconds.
     */
    private wait(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    /**
     * Wait for render completion.
     */
    private waitForRender(): Promise<void> {
        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => resolve())
            })
        })
    }
}
