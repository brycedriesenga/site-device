
import {
    Box,
    TldrawUiContextualToolbar,
    TldrawUiToolbarButton,
    track,
    useEditor,
} from 'tldraw'
import {
    RotateCcw,
    Camera,
    Settings,
    ChevronDown
} from 'lucide-react'
import { captureDeviceScreenshot } from '../utils/screenshot'
import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { DeviceSettingsModal } from './DeviceSettingsModal'

export const ContextualToolbar = track(() => {
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
        // Close menus if selection changes
        if (screenshotMenuOpen) setScreenshotMenuOpen(false)
        // Keep settings open? No.
        return null
    }

    const shape = selectedShapes[0]
    if (shape.type !== 'device') return null

    // Helper to get bounds for positioning
    const getSelectionBounds = () => {
        const fullBounds = editor.getSelectionRotatedScreenBounds()
        if (!fullBounds) return undefined
        return new Box(fullBounds.x, fullBounds.y, fullBounds.width, 0)
    }

    const handleRotate = () => {
        const { w, h } = shape.props as any
        editor.updateShape({
            id: shape.id,
            type: 'device',
            props: { w: h, h: w }
        })
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

    // Helper to avoiding reading ref inside render if possible, but here it's event handler
    const setMenuPositionSafe = (rect: DOMRect) => {
        setMenuPos({ x: rect.left, y: rect.bottom + 4 });
    }

    const handleSettingsSave = (newProps: any) => {
        editor.updateShape({
            id: shape.id,
            type: 'device',
            props: newProps
        })
    }

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
                    {/* Backdrop to close on click outside */}
                    <div
                        className="fixed inset-0 z-[4000] bg-transparent"
                        onClick={() => { setScreenshotMenuOpen(false); setMenuPos(null); }}
                    />
                    {/* Menu */}
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
