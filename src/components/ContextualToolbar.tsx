
import {
    Box,
    TldrawUiContextualToolbar,
    TldrawUiToolbarButton,
    track,
    useEditor,
    type TLShapeId,
    type TLShape
} from 'tldraw'
import {
    RotateCcw,
    Camera,
    Settings,

    Pencil,
    Eye,
    EyeOff
} from 'lucide-react'
import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { DeviceSettingsModal } from './DeviceSettingsModal'
import { useDeviceScreenshot } from '../utils/useDeviceScreenshot'
import type { ScreenshotType } from '../utils/DeviceScreenshotter'

export const ContextualToolbar = track(({ onEnterAnnotationMode }: { onEnterAnnotationMode?: (deviceId: string, containerId: string) => void }) => {
    const editor = useEditor()
    const capture = useDeviceScreenshot(editor)

    // Check if we have exactly one selected shape and it is a device
    const selectedShapes = editor.getSelectedShapes()

    // State for screenshot menu
    const [screenshotMenuOpen, setScreenshotMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState<{ x: number, y: number } | null>(null);
    const screenshotBtnRef = useRef<HTMLDivElement>(null);
    // State for settings modal
    const [settingsOpen, setSettingsOpen] = useState(false);

    if (selectedShapes.length !== 1) {
        if (screenshotMenuOpen) setScreenshotMenuOpen(false)
        return null
    }

    const shape = selectedShapes[0]
    if (shape.type !== 'device') return null

    // Helper to get bounds
    const getSelectionBounds = () => {
        const fullBounds = editor.getSelectionRotatedScreenBounds()
        if (!fullBounds) return undefined
        return new Box(fullBounds.x, fullBounds.y, fullBounds.width, 0)
    }

    const handleRotate = () => {
        const { w, h } = shape.props as { w: number; h: number }
        const newW = h
        const newH = w

        editor.updateShape({
            id: shape.id,
            type: 'device',
            props: { w: newW, h: newH }
        })

        // Loop: Check if wrapped in a frame, if so update frame too
        const parent = editor.getShape(shape.parentId)
        if (parent && parent.type === 'frame') {
            editor.updateShape({
                id: parent.id,
                type: 'frame',
                props: { w: newW, h: newH }
            })
        }
    }

    const handleScreenshotAction = (type: ScreenshotType) => {
        setScreenshotMenuOpen(false)
        setMenuPos(null)
        capture(shape.id, type)
    }

    const toggleScreenshotMenu = () => {
        if (screenshotMenuOpen) {
            setScreenshotMenuOpen(false);
            setMenuPos(null);
        } else {
            if (screenshotBtnRef.current) {
                const rect = screenshotBtnRef.current.getBoundingClientRect();
                setMenuPositionSafe(rect);
            }
            setScreenshotMenuOpen(true);
        }
    }

    const setMenuPositionSafe = (rect: DOMRect) => {
        setMenuPos({ x: rect.left, y: rect.bottom + 4 });
    }

    const handleSettingsSave = (newProps: Record<string, unknown>) => {
        editor.updateShape({
            id: shape.id,
            type: 'device',
            props: newProps
        })
    }

    // Annotation Logic
    const deviceId = shape.id


    const getActiveAnnotationContainer = (deviceShapeId: TLShapeId, url: string) => {
        // Look for child Frame first
        const children = editor.getSortedChildIdsForParent(deviceShapeId)
        const frame = children
            .map(id => editor.getShape(id))
            .find(s => s && s.type === 'frame')

        if (!frame) return undefined

        // Look for container inside frame
        const frameChildren = editor.getSortedChildIdsForParent(frame.id)
        const containers = frameChildren
            .map(id => editor.getShape(id))
            .filter((s): s is TLShape & { props: { url?: string, w: number, h: number } } => s !== undefined && s.type === 'annotation-container')

        return containers.find(c => c.props.url === url)
    }

    // Determine current active container for button state
    // We check children of the DEVICE shape now
    const currentUrl = (shape.props as { url: string }).url || ''
    const activeContainer = getActiveAnnotationContainer(shape.id, currentUrl)

    const isAnnotationVisible = activeContainer ? (activeContainer.opacity !== 0) : false

    const handleAnnotate = () => {
        const devW = (shape.props as { w: number }).w
        const devH = (shape.props as { h: number }).h
        const devUrl = (shape.props as { url: string }).url || ''

        // 1. Ensure Clipping Frame Exists (Child of Device)
        // We use a standard 'frame' shape to act as the viewport mask.
        // It should match the device dimensions exactly.
        const deviceChildren = editor.getSortedChildIdsForParent(shape.id)
        const frame = deviceChildren
            .map(id => editor.getShape(id))
            .find(s => s && s.type === 'frame')

        let frameId: TLShapeId
        if (frame) {
            frameId = frame.id
            // Ensure frame size matches device
            if ((frame.props as { w: number }).w !== devW || (frame.props as { h: number }).h !== devH) {
                editor.updateShape({
                    id: frameId,
                    type: 'frame',
                    props: { w: devW, h: devH }
                })
            }
        } else {
            frameId = `shape:viewport_frame_${deviceId.replace('shape:', '')}` as TLShapeId
            editor.createShape({
                id: frameId,
                type: 'frame',
                x: 0,
                y: 0,
                parentId: shape.id,
                props: { 
                    w: devW, 
                    h: devH, 
                    name: ''
                }
            })
            // Mark the frame as locked so it doesn't intercept clicks/selection
            // This is safe because annotations are children and can still be interacted with
            editor.toggleLock([frameId])
        }

        // 2. Find or Create Annotation Container for this URL (Child of Clipping Frame)
        let targetContainerId: TLShapeId
        const frameChildren = editor.getSortedChildIdsForParent(frameId)
        const containers = frameChildren
            .map(id => editor.getShape(id))
            .filter((s): s is TLShape & { props: { url?: string } } => s !== undefined && s.type === 'annotation-container')

        const existingContainer = containers.find(c => c.props.url === devUrl)

        // Hide all OTHER containers for this device (inside the frame)
        const updates: TLShape[] = []
        containers.forEach(c => {
            if (c.props.url !== devUrl && c.opacity !== 0) {
                updates.push({ ...c, opacity: 0 } as TLShape)
            }
        })

        if (existingContainer) {
            targetContainerId = existingContainer.id
            if (existingContainer.opacity !== 1) {
                updates.push({ ...existingContainer, opacity: 1 } as TLShape)
            }
            // Ensure size sync (width only, height depends on doc)
            if ((existingContainer.props as { w: number }).w !== devW) {
                updates.push({
                    ...existingContainer,
                    props: { ...existingContainer.props, w: devW }
                } as TLShape)
            }
        } else {
            // Create new container inside the Frame
            const suffix = Math.random().toString(36).substring(2, 9)
            targetContainerId = `shape:annotation_${deviceId.replace('shape:', '')}_${suffix}` as TLShapeId

            editor.createShape({
                id: targetContainerId,
                type: 'annotation-container',
                x: 0,
                y: 0, // Starts at top
                parentId: frameId, // Parent to Frame!
                props: { w: devW, h: devH, url: devUrl }
            })
        }

        if (updates.length > 0) {
            editor.updateShapes(updates)
        }

        // Remove the temporary "Clipping Frame" (old method) if it exists
        const oldClipId = `shape:clip_${deviceId.replace('shape:', '')}` as TLShapeId
        if (editor.getShape(oldClipId)) {
            editor.deleteShape(oldClipId)
        }

        // Enter Focus Mode
        if (onEnterAnnotationMode) {
            onEnterAnnotationMode(shape.id, targetContainerId)
        }

        editor.setSelectedShapes([targetContainerId])
        editor.setCurrentTool('draw')
    }

    const handleToggleVisibility = () => {
        if (!activeContainer) return;
        const newOpacity = isAnnotationVisible ? 0 : 1;
        editor.updateShape({
            id: activeContainer.id,
            type: 'annotation-container',
            opacity: newOpacity
        });

        if (newOpacity === 0 && editor.getSelectedShapeIds().includes(activeContainer.id)) {
            editor.selectNone();
        }
    };

    return (
        <>
            <TldrawUiContextualToolbar getSelectionBounds={getSelectionBounds} label="Device Actions">
                <div className="flex flex-col">
                    {/* Header Row: Info */}
                    <div className="flex items-center justify-center gap-2 px-3 py-1.5 border-b border-zinc-200/60 bg-zinc-50/50 rounded-t-md">
                        <span className="text-xs font-semibold text-zinc-900 leading-tight truncate max-w-[120px]">
                            {(shape.props as { name: string }).name}
                        </span>
                        <span className="text-[10px] text-zinc-500 leading-tight font-mono">
                            {(shape.props as { w: number }).w}×{(shape.props as { h: number }).h}
                        </span>
                    </div>

                    {/* Button Row */}
                    <div className="flex items-center justify-center p-1">
                        <div ref={screenshotBtnRef}>
                            <TldrawUiToolbarButton
                                type="icon"
                                title="Screenshot"
                                onClick={toggleScreenshotMenu}
                            >
                                <div className="flex items-center justify-center p-1 gap-0.5">
                                    <Camera size={18} />
                                    {/* <ChevronDown size={10} /> */}
                                </div>
                            </TldrawUiToolbarButton>
                        </div>

                        <TldrawUiToolbarButton
                            type="icon"
                            title="Rotate"
                            onClick={handleRotate}
                        >
                            <div className="flex items-center justify-center p-1">
                                <RotateCcw size={18} />
                            </div>
                        </TldrawUiToolbarButton>

                        <TldrawUiToolbarButton
                            type="icon"
                            title="Settings"
                            onClick={() => setSettingsOpen(true)}
                        >
                            <div className="flex items-center justify-center p-1">
                                <Settings size={18} />
                            </div>
                        </TldrawUiToolbarButton>

                        {/* Divider - Vertically Center */}
                        <div className="self-center w-px h-4 bg-zinc-200 mx-1" />

                        <TldrawUiToolbarButton
                            type="icon"
                            title="Annotate (Focus Mode)"
                            onClick={handleAnnotate}
                        >
                            <div className="flex items-center justify-center p-1">
                                <Pencil size={18} />
                            </div>
                        </TldrawUiToolbarButton>

                        <TldrawUiToolbarButton
                            type="icon"
                            title={isAnnotationVisible ? "Hide Annotations" : "Show Annotations"}
                            onClick={handleToggleVisibility}
                            disabled={!activeContainer}
                        >
                            <div className="flex items-center justify-center p-1">
                                {isAnnotationVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                            </div>
                        </TldrawUiToolbarButton>
                    </div>
                </div>
            </TldrawUiContextualToolbar>

            {settingsOpen && createPortal(
                <DeviceSettingsModal
                    isOpen={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                    deviceProps={shape.props}
                    onSave={handleSettingsSave}
                />,
                document.body
            )}

            {screenshotMenuOpen && menuPos && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-[4000] bg-transparent"
                        onClick={() => { setScreenshotMenuOpen(false); setMenuPos(null); }}
                    />
                    <div
                        className="fixed w-32 bg-white rounded-md shadow-lg border border-zinc-200 py-1 z-[4001] flex flex-col"
                        style={{ top: menuPos.y, left: menuPos.x }}
                    >
                        <button className="text-left px-3 py-1.5 text-xs hover:bg-zinc-100 text-zinc-900" onClick={() => handleScreenshotAction('viewport-1x')}>Viewport (1x)</button>
                        <button className="text-left px-3 py-1.5 text-xs hover:bg-zinc-100 text-zinc-900" onClick={() => handleScreenshotAction('viewport-2x')}>Viewport (2x)</button>
                        <button className="text-left px-3 py-1.5 text-xs hover:bg-zinc-100 text-zinc-900" onClick={() => handleScreenshotAction('full-page')}>Full Page (1x)</button>
                        <button className="text-left px-3 py-1.5 text-xs hover:bg-zinc-100 text-zinc-900" onClick={() => handleScreenshotAction('full-page-2x')}>Full Page (2x)</button>
                    </div>
                </>,
                document.body
            )}
        </>
    )
})
