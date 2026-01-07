import { useRef, useMemo, useEffect, useState } from 'react'
import {
    Tldraw,
    type TLUiOverrides,
    type Editor,
    type TLShape
} from 'tldraw'
import 'tldraw/tldraw.css'

// Device shape
import { DeviceShapeUtil } from './shapes/DeviceShapeUtil'
import type { IDeviceShape } from './shapes/DeviceShapeUtil'

// Annotation shapes
import { AnnotationContainerShapeUtil } from './shapes/annotations/AnnotationContainerShapeUtil'
import { RectangleAnnotationShapeUtil } from './shapes/annotations/RectangleAnnotationShapeUtil'
import { CircleAnnotationShapeUtil } from './shapes/annotations/CircleAnnotationShapeUtil'
import { ArrowAnnotationShapeUtil } from './shapes/annotations/ArrowAnnotationShapeUtil'
import { TextAnnotationShapeUtil } from './shapes/annotations/TextAnnotationShapeUtil'
import { PathAnnotationShapeUtil } from './shapes/annotations/PathAnnotationShapeUtil'

// Components
import { GlobalControls } from './components/GlobalControls'
import { FocusOverlay } from './components/FocusOverlay'
import { ContextualToolbar } from './components/ContextualToolbar'
import { VerticalToolbar } from './components/VerticalToolbar'

// Tools & Utilities
import { MobileTool, TabletTool, DesktopTool } from './tools'
import { useTldrawPersistence } from './utils/useTldrawPersistence'
import { AppStateStorage } from './utils/AppStateStorage'

// Register all shape utilities
const shapeUtils = [
    DeviceShapeUtil,
    AnnotationContainerShapeUtil,
    RectangleAnnotationShapeUtil,
    CircleAnnotationShapeUtil,
    ArrowAnnotationShapeUtil,
    TextAnnotationShapeUtil,
    PathAnnotationShapeUtil,
]

// Register custom tools
const customTools = [MobileTool, TabletTool, DesktopTool]

// Preset definitions
const PRESETS = {
    mobile: { w: 393, h: 852, name: 'Mobile', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1' },
    tablet: { w: 820, h: 1180, name: 'Tablet', ua: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1' },
    desktop: { w: 1440, h: 900, name: 'Desktop', ua: navigator.userAgent }
}

export default function TldrawApp() {
    const [isReady, setIsReady] = useState(false)
    const [activeUrl, setActiveUrl] = useState('')
    const [editor, setEditor] = useState<Editor | null>(null)
    const [hideStylePanel] = useState(true)
    const [recentUrls, setRecentUrls] = useState<string[]>([])

    // Annotation Focus Mode
    const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null)
    const editingDeviceIdRef = useRef<string | null>(null)

    // Persistence Hook - automatically saves/loads tldraw store
    useTldrawPersistence(editor, isReady)

    // UI Components (InFrontOfTheCanvas)
    const components = useMemo(() => ({
        InFrontOfTheCanvas: (props: unknown) => (
            <div className="floating-ui-layer pointer-events-none absolute inset-0 overflow-hidden">
                <ContextualToolbar
                    {...(props as Record<string, unknown>)}
                    onEnterAnnotationMode={(deviceId: string, _containerId: string) => {
                        void _containerId
                        setEditingDeviceId(deviceId)
                        editingDeviceIdRef.current = deviceId
                    }}
                />

                {/* Focus Overlay - dims canvas when annotating */}
                <FocusOverlay focusedDeviceId={editingDeviceIdRef.current} />

                <VerticalToolbar />
            </div>
        ),
    }), [])

    // UI Overrides - add custom tools to tldraw's toolbar
    const uiOverrides: TLUiOverrides = useMemo(() => ({
        tools(_editor, tools) {
            return {
                ...tools,
                'tool-mobile': {
                    id: 'tool-mobile',
                    label: 'Mobile',
                    kbd: 'm',
                    icon: 'device-mobile',
                    onSelect: () => _editor.setCurrentTool('tool-mobile')
                },
                'tool-tablet': {
                    id: 'tool-tablet',
                    label: 'Tablet',
                    kbd: 't',
                    icon: 'device-tablet',
                    onSelect: () => _editor.setCurrentTool('tool-tablet')
                },
                'tool-desktop': {
                    id: 'tool-desktop',
                    label: 'Desktop',
                    kbd: 'd',
                    icon: 'device-desktop',
                    onSelect: () => _editor.setCurrentTool('tool-desktop')
                }
            }
        },
    }), [])

    // Listen for device placement from custom tools
    useEffect(() => {
        const handleAddAtPoint = async (e: CustomEvent) => {
            if (!editor) return
            const { x, y, type, w, h } = e.detail

            const preset = PRESETS[type as keyof typeof PRESETS]
            const id = `shape:device_${Date.now()}` as TLShape['id']

            // Get current device shapes to update UA rules
            const shapes = editor.getCurrentPageShapes()
            const deviceShapes = shapes.filter((s): s is IDeviceShape => s.type === 'device')
            const existingPayload = deviceShapes.map((s) => ({ 
                id: s.id, 
                userAgent: s.props.userAgent, 
                isolation: true 
            }))
            const newDevicePayload = { id: id, userAgent: preset.ua, isolation: true }
            const allDevices = [...existingPayload, newDevicePayload]

            // Send UA rules to background script
            await new Promise<void>(resolve => {
                chrome.runtime.sendMessage({
                    type: 'UPDATE_UA_RULES',
                    devices: allDevices
                }, () => resolve())
            })

            // Create device shape
            editor.createShape({
                id: id,
                type: 'device',
                x: x - w / 2,
                y: y - h / 2,
                props: {
                    w: w,
                    h: h,
                    url: activeUrl,
                    name: preset.name,
                    deviceType: type,
                    userAgent: preset.ua,
                    pixelRatio: 1
                }
            })
        }

        window.addEventListener('tldraw-add-device-at-point', handleAddAtPoint as unknown as EventListener)
        return () => window.removeEventListener('tldraw-add-device-at-point', handleAddAtPoint as unknown as EventListener)
    }, [editor, activeUrl])

    // Load initial state and set ready flag
    useEffect(() => {
        const init = async () => {
            try {
                const state = await AppStateStorage.load()
                setActiveUrl(state.url)
                setRecentUrls(state.recentUrls)
            } catch (error) {
                console.error('[SiteDevice][TldrawApp] Failed to load app state', error)
            } finally {
                setIsReady(true)
            }
        }

        init()
    }, [])

    // Persist app state (URL / recent URLs)
    useEffect(() => {
        if (!isReady) return

        const timeout = window.setTimeout(() => {
            AppStateStorage.save({ url: activeUrl, recentUrls })
        }, 300)

        return () => window.clearTimeout(timeout)
    }, [activeUrl, recentUrls, isReady])

    // Handle tldraw editor mount
    const handleMount = (editorInstance: Editor) => {
        setEditor(editorInstance)
        console.log(
            '[SiteDevice][TldrawApp] Editor mounted, shape utils:',
            shapeUtils.map((s) => (s as { type: string }).type)
        )
    }

    // Keep derived systems (UA rules, device wrappers, annotation containers) in sync
    useEffect(() => {
        if (!editor) return

        let uaTimeout: number | null = null
        let lastDevicesHash = ''

        const sync = () => {
            const shapes = editor.getCurrentPageShapes()
            const deviceShapes = shapes.filter((s): s is IDeviceShape => s.type === 'device')

            // Keep wrapper frame + annotation container dimensions aligned with device dimensions.
            for (const device of deviceShapes) {
                const expectedFrameId = `shape:frame_${device.id.replace('shape:', '')}` as TLShape['id']
                const expectedAnnotationId = `shape:annotation_${device.id.replace('shape:', '')}` as TLShape['id']

                const parent = editor.getShape(device.parentId)
                if (parent && parent.type === 'frame' && parent.id === expectedFrameId) {
                    const p = parent.props as { w: number; h: number }
                    const w = device.props.w
                    const h = device.props.h
                    if (p.w !== w || p.h !== h) {
                        editor.updateShape({ id: parent.id, type: 'frame', props: { w, h } })
                    }
                }

                const annotation = editor.getShape(expectedAnnotationId)
                if (annotation && annotation.type === 'annotation-container') {
                    const p = annotation.props as { w: number; h: number }
                    const w = device.props.w
                    const minH = device.props.h

                    const propsUpdate: Partial<{ w: number; h: number }> = {}
                    if (p.w !== w) propsUpdate.w = w
                    if (p.h < minH) propsUpdate.h = minH

                    if (Object.keys(propsUpdate).length) {
                        editor.updateShape({ id: annotation.id, type: 'annotation-container', props: propsUpdate })
                    }
                }
            }

            // Clean up orphaned wrapper frames / annotation containers when a device is deleted.
            const deviceIds = new Set(deviceShapes.map((d) => d.id))
            const toDelete: TLShape['id'][] = []

            for (const shape of shapes) {
                if (shape.type === 'frame' && shape.id.startsWith('shape:frame_device_')) {
                    const deviceId = `shape:${shape.id.replace('shape:frame_', '')}` as TLShape['id']
                    if (!deviceIds.has(deviceId)) toDelete.push(shape.id)
                }

                if (shape.type === 'annotation-container' && shape.id.startsWith('shape:annotation_device_')) {
                    const deviceId = `shape:${shape.id.replace('shape:annotation_', '')}` as TLShape['id']
                    if (!deviceIds.has(deviceId)) toDelete.push(shape.id)
                }
            }

            if (toDelete.length) {
                editor.deleteShapes(toDelete)
            }

            // Debounced UA rule updates (send empty list to clear rules).
            const devicesPayload = deviceShapes.map((s) => ({
                id: s.id,
                userAgent: s.props.userAgent,
                isolation: true,
            }))

            const nextHash = JSON.stringify(devicesPayload)
            if (nextHash !== lastDevicesHash) {
                lastDevicesHash = nextHash

                if (uaTimeout) window.clearTimeout(uaTimeout)
                uaTimeout = window.setTimeout(() => {
                    chrome.runtime
                        .sendMessage({ type: 'UPDATE_UA_RULES', devices: devicesPayload })
                        .catch((e) => console.error('[SiteDevice][TldrawApp] Failed to update UA rules', e))
                    uaTimeout = null
                }, 250)
            }
        }

        const unlisten = editor.store.listen(sync, { scope: 'all' })
        sync()

        return () => {
            if (uaTimeout) window.clearTimeout(uaTimeout)
            unlisten()
        }
    }, [editor])

    // Listen for messages from content scripts and other frames
    useEffect(() => {
        if (!editor) return
        
        const handleMessage = (msg: { type: string; payload: Record<string, unknown>; sourceDeviceId?: string }) => {
            if (msg.type === 'REPLAY_SCROLL') {
                const deviceId = msg.sourceDeviceId ?? (msg.payload.deviceId as string | undefined)
                if (!deviceId) return

                const pixelY = typeof msg.payload.pixelY === 'number' ? msg.payload.pixelY : 0
                const docHeight = typeof msg.payload.docHeight === 'number' ? msg.payload.docHeight : undefined

                // Find annotation container for this device
                const annotationId = `shape:annotation_${deviceId.replace('shape:', '')}` as TLShape['id']
                const container = editor.getShape(annotationId)

                if (container && container.type === 'annotation-container') {
                    const currentH = (container.props as { h: number }).h

                    editor.updateShape({
                        id: annotationId,
                        type: 'annotation-container',
                        y: -1 * pixelY,
                        props: { h: docHeight ?? currentH },
                    })
                }
            } else if (msg.type === 'REPLAY_NAVIGATED') {
                const url = msg.payload.url

                if (typeof url === 'string' && url !== activeUrl) {
                    setActiveUrl(url)
                    setRecentUrls((prev) => {
                        const newUrls = [url, ...prev.filter((u) => u !== url)].slice(0, 10)
                        return newUrls
                    })
                }
            }
        }

        chrome.runtime.onMessage.addListener(handleMessage)
        return () => chrome.runtime.onMessage.removeListener(handleMessage)
    }, [editor, activeUrl])

    // In annotation mode, reparent newly created shapes into the annotation container so they
    // move with scroll syncing.
    useEffect(() => {
        if (!editor || !editingDeviceId) return

        const annotationId = `shape:annotation_${editingDeviceId.replace('shape:', '')}` as TLShape['id']
        const pageId = editor.getCurrentPageId()

        const knownIds = new Set(editor.getCurrentPageShapes().map((s) => s.id))

        // Make sure the annotation container is on top so it captures pointer events over iframes.
        if (editor.getShape(annotationId)) {
            editor.bringToFront([annotationId])
        }

        const unlisten = editor.store.listen(
            () => {
                if (!editor.getShape(annotationId)) return

                for (const shape of editor.getCurrentPageShapes()) {
                    if (knownIds.has(shape.id)) continue
                    knownIds.add(shape.id)

                    if (shape.id === annotationId) continue
                    if (shape.type === 'device') continue
                    if (shape.type === 'annotation-container') continue

                    // Only reparent shapes created on the page root.
                    if (shape.parentId === pageId) {
                        editor.reparentShapes([shape.id], annotationId)
                    }
                }
            },
            { scope: 'all', source: 'user' }
        )

        return () => unlisten()
    }, [editor, editingDeviceId])

    // Handle URL changes
    const handleUrlChange = (newUrl: string) => {
        setActiveUrl(newUrl)
        setRecentUrls(prev => {
            const newUrls = [newUrl, ...prev.filter(u => u !== newUrl)].slice(0, 10)
            return newUrls
        })

        if (editor) {
            const updates: TLShape[] = []
            editor.getCurrentPageShapes().forEach((shape) => {
                if (shape.type === 'device') {
                    updates.push({
                        id: shape.id,
                        type: 'device',
                        props: { url: newUrl }
                    } as TLShape)
                }
            })
            if (updates.length > 0) editor.updateShapes(updates)
        }
    }

    // Handle device refresh
    const handleRefresh = () => {
        if (editor) {
            editor.getCurrentPageShapes().forEach((shape) => {
                if (shape.type === 'device') {
                    const iframe = document.querySelector(`iframe[name*="${shape.id}"]`) as HTMLIFrameElement
                    if (iframe) {
                        try { 
                            iframe.contentWindow?.location.reload()
                        } catch { 
                            iframe.src = String(iframe.src)
                        }
                    }
                }
            })
        }
    }

    // Clear site data (cache, cookies, storage)
    const clearSiteData = async (dataType: 'cache' | 'cookies' | 'storage') => {
        if (!activeUrl) return
        try {
            await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { type: 'CLEAR_DATA', url: activeUrl, dataType }, 
                    (response) => {
                        if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
                        else if (response && !response.success) reject(response.error)
                        else resolve(response)
                    }
                )
            })
            console.log(`[SiteDevice][TldrawApp] Cleared ${dataType} for ${activeUrl}`)
        } catch (e) {
            console.error(`[SiteDevice][TldrawApp] Failed to clear ${dataType}`, e)
            alert(`Failed to clear ${dataType}: ${e}`)
        }
    }

    const handleClearCache = () => clearSiteData('cache')
    const handleClearCookies = () => clearSiteData('cookies')
    const handleClearStorage = () => clearSiteData('storage')
    const handleOpenSettings = () => {
        alert('Global Settings not implemented yet. You can configure individual devices via their headers.')
    }

    const handleBack = () => {
        chrome.runtime.sendMessage({ type: 'CMD_NAV_BACK' })
    }

    const handleForward = () => {
        chrome.runtime.sendMessage({ type: 'CMD_NAV_FORWARD' })
    }

    const handleExitAnnotationMode = () => {
        setEditingDeviceId(null)
        editingDeviceIdRef.current = null
        if (editor) {
            editor.selectNone()
            editor.setCurrentTool('select')
        }
    }

    if (!isReady) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500" />
                    <p className="text-gray-600">Loading SiteDevice...</p>
                </div>
            </div>
        )
    }

    return (
        <div className={`w-screen h-screen absolute inset-0 overflow-hidden ${hideStylePanel ? 'hide-style-panel' : ''} ${editingDeviceId ? 'annotation-mode' : ''}`}>
            <style>{`
                .tl-frame-heading { display: none !important; }
                .tl-frame__body { stroke: transparent !important; fill: transparent !important; }
                
                /* Z-Index Fixes */
                .tlui-layout { z-index: 10000 !important; }
                .tl-ui-layer { z-index: 10000 !important; }
                
                /* Hide UI in screenshot mode */
                body.screenshot-mode .tlui-layout,
                body.screenshot-mode .tl-ui-layer,
                body.screenshot-mode .floating-ui-layer, 
                body.screenshot-mode .vertical-toolbar {
                    display: none !important;
                }
            `}</style>

            <GlobalControls
                url={activeUrl}
                onUrlChange={handleUrlChange}
                onRefresh={handleRefresh}
                onClearCache={handleClearCache}
                onClearCookies={handleClearCookies}
                onClearStorage={handleClearStorage}
                onOpenSettings={handleOpenSettings}
                onBack={handleBack}
                onForward={handleForward}
                recentUrls={recentUrls}
                annotationModeActive={!!editingDeviceId}
                onExitAnnotationMode={handleExitAnnotationMode}
            />

            <Tldraw
                shapeUtils={shapeUtils}
                tools={customTools}
                components={components}
                onMount={handleMount}
                overrides={uiOverrides}
                persistenceKey="site-device-tldraw"
            />
        </div>
    )
}
