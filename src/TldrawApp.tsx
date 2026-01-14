import { useRef, useMemo, useEffect, useState } from 'react'
import {
    Tldraw,
    type TLUiOverrides,
    type Editor,
    type TLShape,
    useEditor,
    useValue
} from 'tldraw'
import 'tldraw/tldraw.css'

// Device shape
import { DeviceShapeUtil } from './shapes/DeviceShapeUtil'
import type { IDeviceShape } from './shapes/DeviceShapeUtil'
import { AnnotationContainerShapeUtil } from './shapes/AnnotationContainerShapeUtil'

// Annotation shapes
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
import { loadState } from './utils/storage'

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

    // Focus Mode Support
    const [isFocusMode, setIsFocusMode] = useState(false)

    // Bridge component to listen to store changes inside Tldraw context
    const FocusModeListener = ({ onChange }: { onChange: (isFocus: boolean) => void }) => {
        const editor = useEditor()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isFocus = useValue('isFocusMode', () => (editor as any).getInstanceState().isFocusMode, [editor])

        useEffect(() => {
            onChange(isFocus)
        }, [isFocus, onChange])

        return null
    }

    // Annotation Focus Mode
    const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null)
    const editingDeviceIdRef = useRef<string | null>(null)

    // Persistence Hook - automatically saves/loads tldraw store
    useTldrawPersistence(editor, isReady)

    // UI Components (InFrontOfTheCanvas)
    const components = useMemo(() => ({
        InFrontOfTheCanvas: (props: unknown) => (
            <div className="floating-ui-layer pointer-events-none absolute inset-0 overflow-hidden">
                <FocusModeListener onChange={setIsFocusMode} />
                <ContextualToolbar
                    {...(props as Record<string, unknown>)}
                    onEnterAnnotationMode={(deviceId: string) => {
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
                const state = await loadState()
                setActiveUrl(state.url || '')
                setRecentUrls(state.recentUrls || [])
                setIsReady(true)
            } catch (e) {
                console.error("Failed to load state", e)
                setIsReady(true)
            }
        }
        init()
    }, [])

    // Handle tldraw editor mount
    const handleMount = (editorInstance: Editor) => {
        setEditor(editorInstance)
        console.log('[TldrawApp] Editor mounted, shapes registered:', shapeUtils.map(s => (s as { type: string }).type))

        // Setup store listener for UA rule updates
        const unsubscribe = editorInstance.store.listen(() => {
            const shapes = editorInstance.getCurrentPageShapes()
            const deviceShapes = shapes.filter((s): s is IDeviceShape => s.type === 'device')
            const devicesPayload = deviceShapes.map((s) => ({
                id: s.id,
                userAgent: s.props.userAgent,
                isolation: true
            }))

            if (devicesPayload.length > 0) {
                chrome.runtime.sendMessage({
                    type: 'UPDATE_UA_RULES',
                    devices: devicesPayload
                }).catch(e => console.error('Failed to update UA rules', e))
            }
        }, { scope: 'all' })

        return () => unsubscribe()
    }

    // Listen for messages from content scripts and other frames
    useEffect(() => {
        if (!editor) return

        const handleMessage = (msg: { type: string; payload: Record<string, unknown> }) => {
            if (msg.type === 'REPLAY_SCROLL') {
                const { deviceId, pixelY, docHeight } = msg.payload
                if (!deviceId) return

                const shapeId = deviceId as TLShape['id']
                const deviceShape = editor.getShape(shapeId)
                if (!deviceShape) return

                // Scroll Sync: Find active annotation container based on device URL
                // NOW: It is a child of the device
                const deviceUrl = (deviceShape.props as { url: string }).url || ''

                // Helper to find container: Check child Frame first, then direct children
                let container: TLShape | undefined

                const deviceChildrenIds = editor.getSortedChildIdsForParent(deviceShape.id)
                const deviceChildren = deviceChildrenIds.map(id => editor.getShape(id)).filter(s => !!s)

                // 1. Look in Frame (preferred for clipping)
                const frame = deviceChildren.find(s => s.type === 'frame')
                if (frame) {
                    const frameChildrenIds = editor.getSortedChildIdsForParent(frame.id)
                    container = frameChildrenIds
                        .map(id => editor.getShape(id))
                        .find(s => s && s.type === 'annotation-container' && (s.props as { url?: string }).url === deviceUrl)
                }

                // 2. Fallback: Direct child (legacy/migration)
                if (!container) {
                    container = deviceChildren.find(s =>
                        s.type === 'annotation-container' && (s.props as { url?: string }).url === deviceUrl
                    )
                }

                if (container) {
                    // Ensure we have current props
                    const currentH = (container.props as { h: number }).h
                    // console.log('[Scroll-Sync] Updating container:', container.id, 'y:', -1 * ((pixelY as number) || 0))
                    editor.updateShape({
                        id: container.id,
                        type: 'annotation-container',
                        y: -1 * ((pixelY as number) || 0),
                        props: { h: (docHeight as number) || currentH }
                    })
                } else {
                    // console.debug('[Scroll-Sync] No container found for device:', deviceId, 'url:', deviceUrl)
                }
            } else if (msg.type === 'EVENT_NAVIGATED') {
                const { url } = msg.payload
                // We should rely on message deviceId if present, otherwise fallback (imperfect)
                // But normally EVENT_NAVIGATED comes from a specific device via bridge
                // The payload from DeviceEventMirror might strictly be { url }. 
                // Wait, bridge sends { url: lastUrl }. It doesn't attach deviceId in payload?
                // content.ts: bridge.sendToBackground('EVENT_NAVIGATED', { url: lastUrl })
                // Background broadcasts it. sender.tab.id is known but deviceId... payload doesn't have it?
                // Actually DeviceMessageBridge wraps payload? No.
                // WE MISS THE DEVICE ID IN EVENT_NAVIGATED!
                // We can't know WHICH device navigated if there are multiple?
                // TldrawApp is running in an extension page (tab).
                // Messages come from content scripts.

                // Correction: DeviceMessageBridge sends { type, payload }. DeviceId is NOT auto-injected deep in payload.
                // But wait! DeviceEventMirror -> Bridge constructor takes deviceId.
                // Does Bridge inject it?
                // src/utils/DeviceMessageBridge.ts is not visible but assumed.
                // If it doesn't, we have a problem.
                // However, `REPLAY_SCROLL` usually sends deviceId because it's in the payload constructed by mirror.
                // `EVENT_NAVIGATED` payload in content.ts is just `{ url }`.

                // ASSUMPTION: We need to fix URL sync.
                // If we assume single device or active device...
                // Better: Assume the message might be enriched or we need to look at shape props matching? 
                // Let's assume we update ALL devices that match this tab behavior? No, that's messy.
                // If we can't identify the device, we can't sync its prop.

                // Let's modify `handleUrlChange` logic to be reusable and call it?
                // No, `activeUrl` is global "Address Bar".
                // If the user navigates inside the iframe, the "Address Bar" should update.
                // AND the device prop should update.

                if (url && (url as string) !== activeUrl) {
                    const newUrl = url as string
                    setActiveUrl(newUrl)
                    setRecentUrls(prev => {
                        const newUrls = [newUrl, ...prev.filter(u => u !== newUrl)].slice(0, 10)
                        return newUrls
                    })

                    // Update Device Shape(s) to match new URL
                    const updates: TLShape[] = []
                    editor.getCurrentPageShapes().forEach((shape) => {
                        if (shape.type === 'device') {
                            updates.push({
                                id: shape.id,
                                type: 'device',
                                props: { url: newUrl }
                            } as TLShape)

                            // Sync Containers for this device (Direct or in Frame)
                            const deviceChildrenIds = editor.getSortedChildIdsForParent(shape.id)
                            const deviceChildren = deviceChildrenIds.map(id => editor.getShape(id)).filter(s => !!s)

                            const containers: TLShape[] = []
                            // Direct
                            containers.push(...deviceChildren.filter(s => s.type === 'annotation-container'))
                            // Frame
                            const frame = deviceChildren.find(s => s.type === 'frame')
                            if (frame) {
                                const frameChildrenIds = editor.getSortedChildIdsForParent(frame.id)
                                const frameChildren = frameChildrenIds.map(id => editor.getShape(id)).filter(s => !!s)
                                containers.push(...frameChildren.filter(s => s.type === 'annotation-container'))
                            }

                            containers.forEach(container => {
                                // Check optional url
                                const cUrl = (container.props as { url?: string }).url || ''
                                if (cUrl === newUrl) {
                                    if (container.opacity !== 1) {
                                        updates.push({ ...container, opacity: 1 } as TLShape)
                                    }
                                } else if (container.opacity !== 0) {
                                    updates.push({ ...container, opacity: 0 } as TLShape)
                                }
                            })
                        }
                    })
                    if (updates.length > 0) editor.updateShapes(updates)
                }
            }
        }

        chrome.runtime.onMessage.addListener(handleMessage)
        return () => chrome.runtime.onMessage.removeListener(handleMessage)
    }, [editor, activeUrl])

    // Auto-Parenting & Container Management Listener
    useEffect(() => {
        if (!editor) return

        const unsubscribe = editor.store.listen(({ changes }) => {
            // Auto-Parenting for new shapes in Annotation Mode
            const added = changes.added
            const currentEditingDevice = editingDeviceIdRef.current

            if (currentEditingDevice && Object.keys(added).length > 0) {
                const deviceShape = editor.getShape(currentEditingDevice as TLShape['id'])
                if (!deviceShape) return

                // Find target container (Child of Device)
                const deviceUrl = (deviceShape.props as { url: string }).url || ''
                const deviceChildrenIds = editor.getSortedChildIdsForParent(deviceShape.id)
                const deviceChildren = deviceChildrenIds.map(id => editor.getShape(id)).filter(s => !!s)

                // Search priority: Frame Child -> Direct Child
                let targetContainer: TLShape | undefined
                const frame = deviceChildren.find(s => s.type === 'frame')
                if (frame) {
                    const frameChildrenIds = editor.getSortedChildIdsForParent(frame.id)
                    targetContainer = frameChildrenIds
                        .map(id => editor.getShape(id))
                        .find(s => s && s.type === 'annotation-container' && (s.props as { url?: string }).url === deviceUrl)
                }

                if (!targetContainer) {
                    targetContainer = deviceChildren.find(s =>
                        s.type === 'annotation-container' && (s.props as { url?: string }).url === deviceUrl
                    )
                }

                if (!targetContainer) return

                const shapesToReparent: TLShape['id'][] = []

                Object.values(added).forEach(record => {
                    const shape = record as TLShape
                    // Ignore the container itself
                    if (shape.id === targetContainer!.id) return
                    // Ignore device
                    if (shape.id === deviceShape.id) return
                    // Ignore the Frame (parent of container) to prevent cycles
                    if (frame && shape.id === frame.id) return
                    // specific: ignore any frame to be safe? 
                    if (shape.type === 'frame') return

                    // Ignore if already parented correctly
                    if (shape.parentId === targetContainer!.id) return

                    // Reparent everything else created during this mode
                    shapesToReparent.push(shape.id)
                })

                if (shapesToReparent.length > 0) {
                    console.log('[Auto-Parent] Reparenting shapes:', shapesToReparent, 'to container:', targetContainer!.id)
                    // Must wrap in a timeout or schedule to avoid conflicts during transaction? 
                    // Tldraw can handle immediate updates usually, but batching is safer.
                    // However, we are in a listener.
                    editor.reparentShapes(shapesToReparent, targetContainer!.id)
                }
            }
        })

        return () => unsubscribe()
    }, [editor])

    // Soft Lock Listener: Prevent selection of Viewport Frames
    useEffect(() => {
        if (!editor) return

        // This function will be called whenever the selection changes
        const checkSelection = () => {
            // Only intervene if we are in the 'select' tool
            if (editor.getCurrentToolId() !== 'select') return

            const selectedIds = editor.getSelectedShapeIds()
            const newSelection = new Set<string>()
            let hasChanges = false

            selectedIds.forEach(id => {
                const shape = editor.getShape(id)
                if (!shape) return

                // Identify Viewport Frame: It's a frame, child of a device
                if (shape.type === 'frame') {
                    const parent = editor.getShape(shape.parentId)
                    if (parent && parent.type === 'device') {
                        // Select the device instead
                        newSelection.add(parent.id)
                        hasChanges = true
                        return
                    }
                }

                // Keep original selection if it's not a viewport frame
                newSelection.add(id)
            })

            if (hasChanges) {
                // Use requestAnimationFrame to avoid infinite loops and "Maximum update depth" errors
                requestAnimationFrame(() => {
                    editor.select(...Array.from(newSelection) as TLShape['id'][])
                })
            }
        }

        const cleanup = editor.store.listen(
            () => {
                checkSelection()
            },
            { scope: 'all' }
        )

        return () => cleanup()
    }, [editor])

    // Handle URL changes
    const handleUrlChange = (newUrl: string) => {
        setActiveUrl(newUrl)
        setRecentUrls(prev => {
            const newUrls = [newUrl, ...prev.filter(u => u !== newUrl)].slice(0, 10)
            return newUrls
        })

        if (editor) {
            const updates: TLShape[] = []

            // 1. Update Device URL props
            editor.getCurrentPageShapes().forEach((shape) => {
                if (shape.type === 'device') {
                    updates.push({
                        id: shape.id,
                        type: 'device',
                        props: { url: newUrl }
                    } as TLShape)

                    // 2. Sync Annotation Containers (Children of Device OR Frame)
                    const deviceChildrenIds = editor.getSortedChildIdsForParent(shape.id)
                    const deviceChildren = deviceChildrenIds.map(id => editor.getShape(id)).filter(s => !!s)

                    const containers: TLShape[] = []

                    // Direct children
                    containers.push(...deviceChildren.filter(s => s.type === 'annotation-container'))

                    // Frame children
                    const frame = deviceChildren.find(s => s.type === 'frame')
                    if (frame) {
                        const frameChildrenIds = editor.getSortedChildIdsForParent(frame.id)
                        const frameChildren = frameChildrenIds.map(id => editor.getShape(id)).filter(s => !!s)
                        containers.push(...frameChildren.filter(s => s.type === 'annotation-container'))
                    }

                    // Update Opacity based on URL
                    containers.forEach(container => {
                        const props = container.props as { url?: string }
                        const cUrl = props.url || ''
                        if (cUrl === newUrl) {
                            if (container.opacity !== 1) {
                                updates.push({ ...container, opacity: 1 } as TLShape)
                            }
                        } else if (container.opacity !== 0) {
                            updates.push({ ...container, opacity: 0 } as TLShape)
                        }
                    })
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
            console.log(`Cleared ${dataType} for ${activeUrl}`)
        } catch (e) {
            console.error(`Failed to clear ${dataType}`, e)
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
                focusModeActive={isFocusMode}
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
