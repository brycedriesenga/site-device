
import { Editor, type TLShapeId } from 'tldraw'

export async function captureDeviceScreenshot(
    editor: Editor,
    deviceShapeId: string,
    options: { type: 'viewport-1x' | 'viewport-2x' | 'full-page' | 'full-page-2x' },
    onToggleUi?: (hide: boolean) => void
) {
    const shapeId = deviceShapeId as TLShapeId
    const shape = editor.getShape(shapeId)
    if (!shape || shape.type !== 'device') return

    // 1. Prepare for clean screenshot
    const selectedIds = editor.getSelectedShapeIds()
    editor.selectNone()

    // If provided, toggle Tldraw UI
    if (onToggleUi) onToggleUi(true)
    document.body.classList.add('screenshot-mode')

    // Extra buffer for UI removal (React Render). Increased to 600ms total safe zone.
    await wait(150 + (onToggleUi ? 450 : 0))

    // Determine offset
    // If we hid UI via prop, the canvas expands to top (0).
    // If we rely on CSS hiding (no callback), we still have the top bar space, so we crop 80px (TOP_BAR_HEIGHT default).
    const topBarOffset = onToggleUi ? 0 : 80

    try {
        const type = options.type
        const isFullPage = type.startsWith('full-page')
        const scaleFactor = type.includes('2x') ? 2 : 1

        // Unified Handler for both Viewport and Full-Page
        // The only difference is the target height (Device Height vs Page Scroll Height)
        await handleUnifiedScreenshot(editor, shape, scaleFactor, topBarOffset, isFullPage)

    } catch (e) {
        console.error("Screenshot failed", e)
        alert("Screenshot failed. See console for details.")
    } finally {
        // 2. Restore state
        document.body.classList.remove('screenshot-mode')
        if (onToggleUi) onToggleUi(false)
        editor.setSelectedShapes(selectedIds)
    }
}

async function handleUnifiedScreenshot(
    editor: Editor,
    shape: any,
    scaleFactor: number,
    _topBarOffset: number,
    isFullPage: boolean
) {
    const { w, h, name } = shape.props
    const originalHeight = h
    const targetId = shape.id

    // FORCE Top Bar Offset to 0 because we hide UI via CSS
    const effectiveTopBarOffset = 0;

    // Default to device height (Viewport Mode)
    let captureHeight = h

    // If Full Page, try to get scroll height
    if (isFullPage) {
        try {
            const tab = await chrome.tabs.getCurrent()
            if (tab?.id) {
                const dims = await getPageDims(tab.id, targetId)
                if (dims) {
                    captureHeight = Math.max(dims.scrollHeight, h)
                } else {
                    console.warn("Could not get page dims, falling back to viewport height")
                }
            }
        } catch (e) {
            console.warn("Full page capture error", e)
        }
    }

    const originalCamera = { ...editor.getCamera() }

    try {
        // Expand shape for capture if needed
        if (captureHeight !== h) {
            editor.updateShape({
                id: shape.id,
                type: 'device',
                props: { h: captureHeight }
            })
            // Wait for resize
            await wait(300)
        }

        const masterCanvas = document.createElement('canvas')
        masterCanvas.width = w * scaleFactor
        masterCanvas.height = captureHeight * scaleFactor
        const ctx = masterCanvas.getContext('2d')
        if (!ctx) throw new Error("Canvas context failed")

        const viewW = window.innerWidth
        const viewH = window.innerHeight

        // Safety Margin for Capture (ensures device is not at edge)
        const SAFETY_MARGIN = 40

        // Effective Capture Area
        // We will position the device such that the "Tile" is at (SAFETY_MARGIN, effectiveTopBarOffset + SAFETY_MARGIN)
        const captureY = effectiveTopBarOffset + SAFETY_MARGIN
        const captureX = SAFETY_MARGIN

        const safeViewW = viewW - captureX
        const safeViewH = viewH - captureY

        const tileWorldW = safeViewW / scaleFactor
        const tileWorldH = safeViewH / scaleFactor

        const cols = Math.ceil(w / tileWorldW)
        const rows = Math.ceil(captureHeight / tileWorldH)

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const offX = c * tileWorldW
                const offY = r * tileWorldH

                // Camera Logic (Translation Model):
                // We want to translate the world such that (shape.x + offX) moves to (captureX / scaleFactor).
                // Screen = (World + Camera) * Scale
                // captureX = (shape.x + offX + camX) * Scale
                // captureX / Scale = shape.x + offX + camX
                // camX = (captureX / Scale) - (shape.x + offX)

                const camX = (captureX / scaleFactor) - (shape.x + offX)
                const camY = (captureY / scaleFactor) - (shape.y + offY)

                editor.setCamera({ x: camX, y: camY, z: scaleFactor })

                await wait(600) // Generous wait for layout/render

                const dataUrl = await captureTab()
                const img = await loadImage(dataUrl)

                const iframe = document.querySelector(`iframe[name*="${shape.id}"]`)
                if (!iframe) continue

                const rect = iframe.getBoundingClientRect()
                const dpr = window.devicePixelRatio

                // Debug Logging
                console.log(`[Screenshot Debug] Tile ${r},${c}`, {
                    shapePos: { x: shape.x, y: shape.y },
                    off: { x: offX, y: offY },
                    cam: { x: camX, y: camY },
                    captureTarget: { x: captureX, y: captureY },
                    iframeRect: rect,
                    scaleFactor
                });

                // Capture bounds (We scan the whole safe area)
                const viewX = 0
                const viewY = effectiveTopBarOffset

                const sourceX = Math.max(viewX, rect.x)
                const sourceY = Math.max(viewY, rect.y)
                const sourceRight = Math.min(viewX + viewW, rect.right)
                const sourceBottom = Math.min(viewY + viewH, rect.bottom)

                const sourceW = sourceRight - sourceX
                const sourceH = sourceBottom - sourceY

                if (sourceW > 0 && sourceH > 0) {

                    // Destination Calculation based on Camera Offset
                    // WorldX = (ScreenX / Scale) - camX (Inverse of Screen calculation)

                    const worldX = (sourceX / scaleFactor) - camX
                    const worldY = (sourceY / scaleFactor) - camY

                    // Relative to Shape Origin
                    const relX = worldX - shape.x
                    const relY = worldY - shape.y

                    const destX = relX * scaleFactor
                    const destY = relY * scaleFactor

                    console.log(`[Screenshot Debug] Draw ${r},${c}`, {
                        source: { x: sourceX, y: sourceY, w: sourceW, h: sourceH },
                        world: { x: worldX, y: worldY },
                        dest: { x: destX, y: destY }
                    });

                    // Draw!
                    ctx.drawImage(img,
                        sourceX * dpr, sourceY * dpr,
                        sourceW * dpr, sourceH * dpr,
                        destX, destY,
                        sourceW * scaleFactor,
                        sourceH * scaleFactor
                    )
                }
            }
        }

        downloadCanvas(masterCanvas, `${name}-${isFullPage ? 'full' : 'view'}-${scaleFactor}x.png`)

    } finally {
        if (captureHeight !== originalHeight) {
            editor.updateShape({
                id: shape.id,
                type: 'device',
                props: { h: originalHeight }
            })
        }
        editor.setCamera(originalCamera)
    }
}

// Helpers
function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function captureTab(): Promise<string> {
    return new Promise(resolve => {
        chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
            resolve(dataUrl || '')
        })
    })
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
    })
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
    canvas.toBlob(blob => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
    })
}

function getPageDims(tabId: number, deviceId: string): Promise<any> {
    return new Promise(resolve => {
        chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_DIMS', targetDeviceId: deviceId }, (resp) => {
            if (chrome.runtime.lastError) resolve(null)
            else resolve(resp)
        })
        setTimeout(() => resolve(null), 1000)
    })
}
