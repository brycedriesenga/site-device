import { useEditor, track } from 'tldraw'
import type { TLShapeId } from 'tldraw'

export const FocusOverlay = track(({ focusedDeviceId }: { focusedDeviceId: string | null }) => {
    const editor = useEditor();

    // We rely on editor store updates via 'track'.

    if (!focusedDeviceId) return null;

    const shapeId = focusedDeviceId as TLShapeId;
    const shape = editor.getShape(shapeId);
    if (!shape) return null;

    const pageBounds = editor.getShapePageBounds(shapeId);
    if (!pageBounds) return null;

    // Convert Page Bounds (Canvas) to Viewport Bounds (Screen)
    const topLeft = editor.pageToViewport({ x: pageBounds.x, y: pageBounds.y });
    const zoom = editor.getZoomLevel();

    // Calculate width/height in screen pixels
    const width = pageBounds.w * zoom;
    const height = pageBounds.h * zoom;

    return (
        <div className="absolute inset-0 z-[50] pointer-events-none">
            <svg width="100%" height="100%" className="w-full h-full">
                <defs>
                    <mask id="focus-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        <rect
                            x={topLeft.x}
                            y={topLeft.y}
                            width={width}
                            height={height}
                            rx="8"
                            fill="black"
                        />
                    </mask>
                </defs>
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="rgba(0,0,0,0.7)"
                    mask="url(#focus-mask)"
                />
            </svg>
        </div>
    );
});
