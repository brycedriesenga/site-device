
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

        if (isFullPage) {
            await handleFullPageScreenshot(editor, shape, scaleFactor, topBarOffset)
        } else {
            // Viewport Screenshot
            await handleViewportScreenshot(editor, shape, scaleFactor, topBarOffset)
        }
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

async function handleViewportScreenshot(editor: Editor, shape: any, scaleFactor: number, topBarOffset: number) {
    const { w, h, name } = shape.props

    // Calculate Zoom and Position
    const viewW = window.innerWidth
    const contentScreenW = w * scaleFactor
    const marginX = Math.max(0, (viewW - contentScreenW) / 2)

    // CamX Calculation
    const camX = (marginX / scaleFactor) - shape.x

    // CamY Calculation
    // We want content at `topBarOffset` from top.
    const camY = (topBarOffset / scaleFactor) - shape.y

    // Animate Camera (Instant)
    editor.setCamera({ x: camX, y: camY, z: scaleFactor })

    await wait(500)

    const dataUrl = await captureTab()
    const img = await loadImage(dataUrl)
    const dpr = window.devicePixelRatio

    const iframe = document.querySelector(`iframe[name*="${shape.id}"]`)
    if (!iframe) throw new Error("Iframe not found")

    const rect = iframe.getBoundingClientRect()

    const canvas = document.createElement('canvas')
    canvas.width = w * scaleFactor
    canvas.height = h * scaleFactor
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Screen Crop Area
    const viewY = topBarOffset
    const viewX = 0
    const viewWLocal = window.innerWidth
    const viewHLocal = window.innerHeight

    const sourceX = Math.max(viewX, rect.x)
    const sourceY = Math.max(viewY, rect.y)
    const sourceRight = Math.min(viewX + viewWLocal, rect.right)
    const sourceBottom = Math.min(viewY + viewHLocal, rect.bottom)

    const sourceW = sourceRight - sourceX
    const sourceH = sourceBottom - sourceY

    if (sourceW > 0 && sourceH > 0) {
        ctx.drawImage(img,
            sourceX * dpr, sourceY * dpr,
            sourceW * dpr, sourceH * dpr,
            (sourceX - rect.x),
            (sourceY - rect.y),
            sourceW,
            sourceH
        )
    }

    downloadCanvas(canvas, `${name}-${scaleFactor}x.png`)
}

async function handleFullPageScreenshot(editor: Editor, shape: any, scaleFactor: number, topBarOffset: number) {
    const { w, h, name } = shape.props
    const originalHeight = h
    const targetId = shape.id

    const tab = await chrome.tabs.getCurrent()
    if (!tab?.id) throw new Error("No active tab")

    const dims = await getPageDims(tab.id, targetId)
    if (!dims) {
        alert("Could not connect to device page. Try reloading it.")
        return
    }

    const fullHeight = Math.max(dims.scrollHeight, h)
    const originalCamera = { ...editor.getCamera() }

    try {
        editor.updateShape({
            id: shape.id,
            type: 'device',
            props: { h: fullHeight }
        })

        await wait(800)

        const masterCanvas = document.createElement('canvas')
        masterCanvas.width = w * scaleFactor
        masterCanvas.height = fullHeight * scaleFactor
        const ctx = masterCanvas.getContext('2d')
        if (!ctx) throw new Error("Canvas context failed")

        const viewW = window.innerWidth
        const viewH = window.innerHeight

        // Effective Screen Area
        const safeScreenW = viewW
        const safeScreenH = viewH - topBarOffset // Use dynamic offset

        const tileWorldW = safeScreenW / scaleFactor
        const tileWorldH = safeScreenH / scaleFactor

        const cols = Math.ceil(w / tileWorldW)
        const rows = Math.ceil(fullHeight / tileWorldH)

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const offX = c * tileWorldW
                const offY = r * tileWorldH

                // Center Horizontally
                const contentScreenW = w * scaleFactor
                const marginX = Math.max(0, (viewW - contentScreenW) / 2)

                let targetScreenX = 0
                if (cols === 1) {
                    targetScreenX = marginX
                }

                const camX = (targetScreenX / scaleFactor) - (shape.x + offX)

                // CamY: target topBarOffset
                const camY = (topBarOffset / scaleFactor) - (shape.y + offY)

                editor.setCamera({ x: camX, y: camY, z: scaleFactor })

                await wait(400)

                const dataUrl = await captureTab()
                const img = await loadImage(dataUrl)

                const iframe = document.querySelector(`iframe[name*="${shape.id}"]`)
                if (!iframe) continue

                const rect = iframe.getBoundingClientRect()
                const dpr = window.devicePixelRatio

                // Capture bounds
                const viewX = 0
                const viewY = topBarOffset

                const sourceX = Math.max(viewX, rect.x)
                const sourceY = Math.max(viewY, rect.y)
                const sourceRight = Math.min(viewX + viewW, rect.right)
                const sourceBottom = Math.min(viewY + viewH, rect.bottom)

                const sourceW = sourceRight - sourceX
                const sourceH = sourceBottom - sourceY

                if (sourceW > 0 && sourceH > 0) {
                    const destX = sourceX - rect.x
                    const destY = sourceY - rect.y

                    ctx.drawImage(img,
                        sourceX * dpr, sourceY * dpr,
                        sourceW * dpr, sourceH * dpr,
                        destX, destY,
                        sourceW, sourceH
                    )
                }
            }
        }

        downloadCanvas(masterCanvas, `fullpage-${name}-${scaleFactor}x.png`)

    } finally {
        editor.updateShape({
            id: shape.id,
            type: 'device',
            props: { h: originalHeight }
        })
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
