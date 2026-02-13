import { Editor, type TLShapeId } from 'tldraw'

export type ScreenshotType = 'viewport-1x' | 'viewport-2x' | 'full-page' | 'full-page-2x'

export interface ScreenshotOptions {
    type: ScreenshotType
}

interface CaptureSession {
    canvas: HTMLCanvasElement
    ctx: CanvasRenderingContext2D
    deviceId: string
    scaleFactor: number
    captureHeight: number
    originalHeight: number
}

interface TileGrid {
    rows: number
    cols: number
    tileWorldW: number
    tileWorldH: number
    captureX: number
    captureY: number
}

/**
 * Handles device screenshot capture with support for viewport and full-page modes.
 */
export class DeviceScreenshotter {
    private editor: Editor

    private readonly SAFETY_MARGIN = 40
    private readonly RENDER_WAIT = 600
    private readonly UI_HIDE_WAIT = 200
    private readonly SAVE_DEBOUNCE = 500

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

        const session: Omit<CaptureSession, 'ctx'> = {
            canvas: document.createElement('canvas'),
            deviceId: deviceShapeId,
            scaleFactor: options.type.includes('2x') ? 2 : 1,
            captureHeight: (shape.props as { h: number }).h,
            originalHeight: (shape.props as { h: number }).h,
        }

        const ctx = session.canvas.getContext('2d')
        if (!ctx) throw new Error('Failed to get canvas context')

        const fullSession: CaptureSession = { ...session, ctx }

        try {
            this.hideUI()
            this.editor.selectNone()
            await this.wait(this.UI_HIDE_WAIT)

            const isFullPage = options.type.startsWith('full-page')
            if (isFullPage) {
                const fullHeight = await this.getPageHeight(deviceShapeId)
                if (fullHeight) {
                    fullSession.captureHeight = Math.max(fullHeight, fullSession.originalHeight)
                }
            }

            const shapeAfterPrep = this.editor.getShape(shapeId)
            if (!shapeAfterPrep || shapeAfterPrep.type !== 'device') {
                throw new Error(`Device shape not found after prep: ${deviceShapeId}`)
            }

            const deviceW = (shapeAfterPrep.props as { w: number }).w

            // Resize master canvas (output)
            fullSession.canvas.width = deviceW * fullSession.scaleFactor
            fullSession.canvas.height = fullSession.captureHeight * fullSession.scaleFactor

            // Expand device shape if capturing full page
            if (fullSession.captureHeight !== fullSession.originalHeight) {
                this.editor.updateShape({
                    id: shapeAfterPrep.id,
                    type: 'device',
                    props: { h: fullSession.captureHeight },
                })
                await this.wait(300)
            }

            const bounds = this.editor.getShapePageBounds(shapeId)
            if (!bounds) throw new Error('Failed to compute device bounds')

            await this.captureTiles(fullSession, {
                deviceId: shapeId,
                deviceX: bounds.x,
                deviceY: bounds.y,
                deviceW,
            })

            const fileName = `${(shapeAfterPrep.props as { name: string }).name}-${options.type}.png`
            this.downloadImage(fullSession.canvas, fileName)
        } finally {
            // Restore shape height
            if (fullSession.captureHeight !== fullSession.originalHeight) {
                this.editor.updateShape({
                    id: shapeId,
                    type: 'device',
                    props: { h: fullSession.originalHeight },
                })
            }

            // Restore camera and selection
            this.editor.setCamera(originalCamera)
            this.editor.setSelectedShapes(selectedIds)

            this.showUI()
        }
    }

    /**
     * Capture screenshot in tiles to work around viewport limitations.
     */
    private async captureTiles(
        session: CaptureSession,
        device: { deviceId: TLShapeId; deviceX: number; deviceY: number; deviceW: number }
    ): Promise<void> {
        const grid = this.getTileGrid(session, device.deviceW)

        console.log(
            `[Screenshot] Capturing ${grid.rows}x${grid.cols} tiles (${device.deviceW}x${session.captureHeight}px at ${session.scaleFactor}x)`
        )

        for (let row = 0; row < grid.rows; row++) {
            for (let col = 0; col < grid.cols; col++) {
                await this.captureTile(session, device, grid, { row, col })
            }
        }
    }

    private getTileGrid(session: CaptureSession, deviceW: number): TileGrid {
        const viewW = window.innerWidth
        const viewH = window.innerHeight

        const captureX = this.SAFETY_MARGIN
        const captureY = this.SAFETY_MARGIN

        const safeViewW = viewW - captureX
        const safeViewH = viewH - captureY

        const tileWorldW = safeViewW / session.scaleFactor
        const tileWorldH = safeViewH / session.scaleFactor

        return {
            captureX,
            captureY,
            tileWorldW,
            tileWorldH,
            cols: Math.ceil(deviceW / tileWorldW),
            rows: Math.ceil(session.captureHeight / tileWorldH),
        }
    }

    /**
     * Capture a single tile.
     */
    private async captureTile(
        session: CaptureSession,
        device: { deviceId: TLShapeId; deviceX: number; deviceY: number; deviceW: number },
        grid: TileGrid,
        tile: { row: number; col: number }
    ): Promise<void> {
        const { row, col } = tile

        const offX = col * grid.tileWorldW
        const offY = row * grid.tileWorldH

        // Camera translation: place the top-left of this tile at (captureX, captureY) in screen space.
        const camX = grid.captureX / session.scaleFactor - (device.deviceX + offX)
        const camY = grid.captureY / session.scaleFactor - (device.deviceY + offY)

        this.editor.setCamera({ x: camX, y: camY, z: session.scaleFactor })
        await this.wait(this.RENDER_WAIT)

        const dataUrl = await this.captureTabImage()
        if (!dataUrl) {
            throw new Error('Failed to capture tab image')
        }

        const image = await this.loadImage(dataUrl)

        const iframe = document.querySelector(`iframe[name*="${session.deviceId}"]`) as HTMLIFrameElement | null
        if (!iframe) {
            console.warn(`[Screenshot] Iframe not found for tile ${row},${col}`)
            return
        }

        const iframeRect = iframe.getBoundingClientRect()
        const dpr = window.devicePixelRatio

        const sourceX = Math.max(0, iframeRect.x)
        const sourceY = Math.max(0, iframeRect.y)
        const sourceRight = Math.min(window.innerWidth, iframeRect.right)
        const sourceBottom = Math.min(window.innerHeight, iframeRect.bottom)

        const sourceW = Math.max(0, sourceRight - sourceX)
        const sourceH = Math.max(0, sourceBottom - sourceY)

        if (sourceW <= 0 || sourceH <= 0) {
            console.warn(`[Screenshot] Tile ${row},${col} has no visible area`)
            return
        }

        const worldX = sourceX / session.scaleFactor - camX
        const worldY = sourceY / session.scaleFactor - camY
        const relX = worldX - device.deviceX
        const relY = worldY - device.deviceY

        const destX = relX * session.scaleFactor
        const destY = relY * session.scaleFactor

        session.ctx.drawImage(
            image,
            sourceX * dpr,
            sourceY * dpr,
            sourceW * dpr,
            sourceH * dpr,
            destX,
            destY,
            sourceW * session.scaleFactor,
            sourceH * session.scaleFactor
        )

        console.log(`[Screenshot] Captured tile ${row},${col}`)
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

            // Allow the download to start before revoking the URL.
            setTimeout(() => URL.revokeObjectURL(url), this.SAVE_DEBOUNCE)
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
}
