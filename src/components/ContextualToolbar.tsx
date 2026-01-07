
import {
    Box,
    TldrawUiContextualToolbar,
    TldrawUiToolbarButton,
    track,
    useEditor,
    type TLShapeId
} from 'tldraw'
import {
    RotateCcw,
    Camera,
    Settings,
    ChevronDown,
    Pencil,
    Eye,
    EyeOff
} from 'lucide-react'
import { captureDeviceScreenshot } from '../utils/screenshot'
import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { DeviceSettingsModal } from './DeviceSettingsModal'

export const ContextualToolbar = track(({ onEnterAnnotationMode }: { onEnterAnnotationMode?: (deviceId: string, containerId: string) => void }) => {
    const editor = useEditor()
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

    const handleScreenshotAction = (type: 'viewport-1x' | 'viewport-2x' | 'full-page' | 'full-page-2x') => {
        setScreenshotMenuOpen(false);
        setMenuPos(null);
        captureDeviceScreenshot(editor, shape.id, { type });
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
    // ID Scheme: shape:annotation_...
    const annotationId = `shape:annotation_${deviceId.replace('shape:', '')}` as TLShapeId

    const annotationShape = editor.getShape(annotationId)
    const isAnnotationVisible = annotationShape ? (annotationShape.opacity !== 0) : false

    const handleAnnotate = () => {
        const devW = (shape.props as { w: number }).w
        const devH = (shape.props as { h: number }).h
        const parent = editor.getShape(shape.parentId)

        // Define frameId consistently
        let frameId: TLShapeId;

        // 1. Check if we need to Wrap in Frame
        if (!parent || parent.type !== 'frame') {
            // Create Wrapper Frame at Device Position
            frameId = `shape:frame_${deviceId.replace('shape:', '')}` as TLShapeId;
            const x = shape.x;
            const y = shape.y;

            // Create Frame
            editor.createShape({
                id: frameId,
                type: 'frame',
                x: x,
                y: y,
                props: { w: devW, h: devH, name: ' ' }
            });

            // Move Device INTO Frame (Reset pos to 0,0)
            editor.reparentShapes([deviceId], frameId);
            editor.updateShape({ id: deviceId, type: 'device', x: 0, y: 0 });
        } else {
            // Already wrapped
            frameId = parent.id;
            // Sync Size
            editor.updateShape({
                id: frameId,
                type: 'frame',
                props: { w: devW, h: devH }
            });
        }

        // 2. Ensure Annotation Container Exists (Child of Frame)
        if (!editor.getShape(annotationId)) {
            editor.createShape({
                id: annotationId,
                type: 'annotation-container',
                x: 0,
                y: 0,
                parentId: frameId,
                props: { w: devW, h: devH }
            });
        } else {
            // Migration/Fix Parenting
            const current = editor.getShape(annotationId);
            if (current && current.parentId !== frameId) {
                editor.reparentShapes([annotationId], frameId);
                editor.updateShape({ id: annotationId, type: 'annotation-container', x: 0 });
            }
        }

        // Ensure visible
        editor.updateShape({ id: annotationId, type: 'annotation-container', opacity: 1 })

        // Remove the temporary "Clipping Frame" (old method) if it exists
        const oldClipId = `shape:clip_${deviceId.replace('shape:', '')}` as TLShapeId
        if (editor.getShape(oldClipId)) {
            editor.deleteShape(oldClipId)
        }

        // Enter Focus Mode
        if (onEnterAnnotationMode) {
            onEnterAnnotationMode(shape.id, annotationId)
        }

        editor.setSelectedShapes([annotationId])
        editor.setCurrentTool('draw')
    }

    const handleToggleVisibility = () => {
        if (!annotationShape) return;
        const newOpacity = isAnnotationVisible ? 0 : 1;
        editor.updateShape({
            id: annotationId,
            type: 'annotation-container',
            opacity: newOpacity
        });

        if (newOpacity === 0 && editor.getSelectedShapeIds().includes(annotationId)) {
            editor.selectNone();
        }
    };

    return (
        <>
            <TldrawUiContextualToolbar getSelectionBounds={getSelectionBounds} label="Device Actions">
                <div ref={screenshotBtnRef}>
                    <TldrawUiToolbarButton
                        type="icon"
                        title="Screenshot"
                        onClick={toggleScreenshotMenu}
                    >
                        <div className="flex items-center justify-center p-1 gap-0.5">
                            <Camera size={18} />
                            <ChevronDown size={10} />
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
                    disabled={!annotationShape}
                >
                    <div className="flex items-center justify-center p-1">
                        {isAnnotationVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                    </div>
                </TldrawUiToolbarButton>
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
