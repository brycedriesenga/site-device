import React from 'react';
import type { Annotation } from '../types';

interface AnnotationLayerProps {
    annotations: Annotation[];
    currentAnnotation: Annotation | null;
    selectedAnnotationIds?: string[];
    hoveredAnnotationIds?: string[];
    editingTextId?: string | null;
    selectionBox?: { startX: number, startY: number, currentX: number, currentY: number } | null;
    onTextUpdate?: (id: string, content: string) => void;
    onTextBlur?: (id: string, content: string) => void;
    onAnnotationHover?: (id: string | null) => void;
    onResizeStart?: (e: React.MouseEvent, id: string, handle: string) => void;
    onTextEdit?: (id: string) => void;
    onAnnotationMouseDown?: (e: React.MouseEvent, id: string) => void;
}

const AnnotationInput = ({ ann, onUpdate, onBlur }: {
    ann: Annotation,
    onUpdate?: (id: string, content: string) => void,
    onBlur?: (id: string, content: string) => void
}) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, []);

    const fontSize = ann.fontSize || 16;
    const height = fontSize * 1.2;
    const width = Math.max(10, (ann.content?.length || 0) * (fontSize * 0.6) + 4);

    return (
        <foreignObject
            key={ann.id}
            x={ann.x}
            y={ann.y}
            width={width + 4} // Extra buffer
            height={height}
            style={{ overflow: 'visible', pointerEvents: 'auto' }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <input
                ref={inputRef}
                value={ann.content || ''}
                onChange={(e) => onUpdate && onUpdate(ann.id, e.target.value)}
                className="bg-transparent outline-none text-left p-0 m-0 border-none"
                style={{
                    color: ann.color,
                    fontSize: fontSize,
                    fontFamily: 'sans-serif',
                    minWidth: '10px',
                    width: `${width}px`,
                    height: '100%',
                    lineHeight: 1
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        onBlur && onBlur(ann.id, (e.target as HTMLInputElement).value);
                    }
                }}
                onBlur={(e) => {
                    onBlur && onBlur(ann.id, e.target.value);
                }}
            />
        </foreignObject>
    );
};

export const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
    annotations,
    currentAnnotation,
    selectedAnnotationIds = [],
    hoveredAnnotationIds = [],
    editingTextId,
    selectionBox,
    onTextUpdate,
    onTextBlur,
    onResizeStart,
    onAnnotationMouseDown,
    onTextEdit
}) => {
    const renderAnnotation = (ann: Annotation) => {
        // Skip rendering text if it is being edited
        if (ann.id === editingTextId && ann.type === 'text') return null;

        const isHovered = hoveredAnnotationIds.includes(ann.id);
        const style = {
            filter: isHovered ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.6))' : 'none',
            cursor: 'pointer'
        };

        switch (ann.type) {
            case 'path':
                if (!ann.points || ann.points.length < 2) return null;
                const d = `M ${ann.points[0]} ${ann.points[1]} ` +
                    ann.points.slice(2).reduce((acc, val, i, arr) => {
                        return i % 2 === 0 ? acc + `L ${val} ${arr[i + 1]} ` : acc;
                    }, '');
                return (
                    <path
                        key={ann.id}
                        d={d}
                        stroke={ann.color}
                        strokeWidth={ann.strokeWidth || 2}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={style}
                    />
                );

            case 'rect':
                return (
                    <rect
                        key={ann.id}
                        x={ann.x}
                        y={ann.y}
                        width={Math.abs(ann.width || 0)}
                        height={Math.abs(ann.height || 0)}
                        stroke={ann.color}
                        strokeWidth={ann.strokeWidth || 2}
                        fill="none"
                        rx={4}
                        style={style}
                    />
                );

            case 'circle':
                const rx = Math.abs(ann.width || 0) / 2;
                const ry = Math.abs(ann.height || 0) / 2;
                const cx = (ann.x || 0) + (ann.width || 0) / 2;
                const cy = (ann.y || 0) + (ann.height || 0) / 2;
                return (
                    <ellipse
                        key={ann.id}
                        cx={cx}
                        cy={cy}
                        rx={rx}
                        ry={ry}
                        stroke={ann.color}
                        strokeWidth={ann.strokeWidth || 2}
                        fill="none"
                        style={style}
                    />
                );

            case 'arrow':
                return (
                    <g key={ann.id} style={style}>
                        <defs>
                            <marker
                                id={`arrowhead-${ann.id}`}
                                markerWidth="10"
                                markerHeight="7"
                                refX="9"
                                refY="3.5"
                                orient="auto"
                            >
                                <polygon points="0 0, 10 3.5, 0 7" fill={ann.color} />
                            </marker>
                        </defs>
                        {ann.controlX !== undefined && ann.controlY !== undefined ? (
                            <path
                                d={`M ${ann.startX} ${ann.startY} Q ${ann.controlX} ${ann.controlY} ${ann.endX} ${ann.endY}`}
                                stroke={ann.color}
                                strokeWidth={ann.strokeWidth || 2}
                                fill="none"
                                markerEnd={`url(#arrowhead-${ann.id})`}
                            />
                        ) : (
                            <line
                                x1={ann.startX}
                                y1={ann.startY}
                                x2={ann.endX}
                                y2={ann.endY}
                                stroke={ann.color}
                                strokeWidth={ann.strokeWidth || 2}
                                markerEnd={`url(#arrowhead-${ann.id})`}
                            />
                        )}
                    </g>
                );

            case 'text':
                return (
                    <text
                        key={ann.id}
                        x={ann.x}
                        y={(ann.y || 0) + (ann.fontSize || 16) * 1.2 / 2}
                        fill={ann.color}
                        fontSize={ann.fontSize || 16}
                        fontFamily="sans-serif"
                        dominantBaseline="central"
                        style={{ ...style, userSelect: 'none', pointerEvents: 'visible' }}
                        onMouseDown={(e) => {
                            e.preventDefault(); // Prevent canvas drag?
                            e.stopPropagation();
                            onAnnotationMouseDown && onAnnotationMouseDown(e, ann.id);
                        }}
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            onTextEdit && onTextEdit(ann.id);
                        }}
                    >
                        {ann.content}
                    </text>
                );

            default:
                return null;
        }
    };

    const selectedAnns = annotations
        .filter(a => selectedAnnotationIds.includes(a.id))
        .filter(a => a.id !== editingTextId); // Hide bounds for editing item
    const editingAnn = annotations.find(a => a.id === editingTextId);

    const getBounds = (ann: Annotation) => {
        if (ann.type === 'rect' || ann.type === 'text') {
            let w = ann.width || 0;
            let h = ann.height || 0;

            if (ann.type === 'text') {
                const fs = ann.fontSize || 16;
                w = Math.max(10, (ann.content?.length || 0) * (fs * 0.6) + 4);
                h = fs * 1.2;
            }
            return { x: ann.x || 0, y: ann.y || 0, w, h };
        }
        if (ann.type === 'circle') {
            return { x: ann.x || 0, y: ann.y || 0, w: ann.width || 0, h: ann.height || 0 };
        }
        if (ann.type === 'arrow') {
            const M = Math.min(ann.startX || 0, ann.endX || 0);
            const f = Math.min(ann.startY || 0, ann.endY || 0);
            const I = Math.max(ann.startX || 0, ann.endX || 0);
            const w = Math.max(ann.startY || 0, ann.endY || 0);

            // Include control point in bounds if present
            if (ann.controlX !== undefined && ann.controlY !== undefined) {
                return {
                    x: Math.min(M, ann.controlX),
                    y: Math.min(f, ann.controlY),
                    w: Math.max(I, ann.controlX) - Math.min(M, ann.controlX),
                    h: Math.max(w, ann.controlY) - Math.min(f, ann.controlY)
                };
            }
            return { x: M, y: f, w: I - M, h: w - f };
        }
        // Path bounds needed
        if (ann.type === 'path' && ann.points) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (let i = 0; i < ann.points.length; i += 2) {
                const x = ann.points[i];
                const y = ann.points[i + 1];
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
            return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
        }
        return null;
    };

    const renderHandle = (id: string, x: number, y: number, cursor: string, handleId: string) => (
        <rect
            key={`${id}-${handleId}`}
            x={x - 4}
            y={y - 4}
            width="8"
            height="8"
            fill="white"
            stroke="#3b82f6"
            strokeWidth="1"
            style={{ cursor, pointerEvents: 'auto' }}
            onMouseDown={(e) => {
                e.stopPropagation();
                onResizeStart && onResizeStart(e, id, handleId);
            }}
        />
    );

    // Custom Round Handle for Points
    const renderPointHandle = (id: string, x: number, y: number, handleId: string) => (
        <circle
            key={`${id}-${handleId}`}
            cx={x}
            cy={y}
            r={5}
            fill="white"
            stroke="#3b82f6"
            strokeWidth="2"
            style={{ cursor: 'move', pointerEvents: 'auto' }}
            onMouseDown={(e) => {
                e.stopPropagation();
                onResizeStart && onResizeStart(e, id, handleId);
            }}
        />
    );

    return (
        <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible z-[210]"
            style={{ width: '1px', height: '1px' }}
        >
            {annotations.map(renderAnnotation)}
            {currentAnnotation && renderAnnotation(currentAnnotation)}

            {/* Selection UI */}
            {selectedAnns.length === 1 ? selectedAnns.map(ann => {
                // Special handling for Arrow Point Editing
                if (ann.type === 'arrow') {
                    // Ensure control points exist or default to center
                    const cx = ann.controlX !== undefined ? ann.controlX : ((ann.startX || 0) + (ann.endX || 0)) / 2;
                    const cy = ann.controlY !== undefined ? ann.controlY : ((ann.startY || 0) + (ann.endY || 0)) / 2;

                    return (
                        <g key={ann.id}>
                            {/* Dashed line showing skeleton */}
                            <path d={`M ${ann.startX} ${ann.startY} L ${cx} ${cy} L ${ann.endX} ${ann.endY}`} stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 2" fill="none" opacity="0.5" />

                            {renderPointHandle(ann.id, ann.startX || 0, ann.startY || 0, 'start')}
                            {renderPointHandle(ann.id, ann.endX || 0, ann.endY || 0, 'end')}
                            {renderPointHandle(ann.id, cx, cy, 'control')}
                        </g>
                    );
                }

                const bounds = getBounds(ann);
                if (!bounds) return null;
                // ... rest of bounds logic ... 
                let x = bounds.x, y = bounds.y, w = bounds.w, h = bounds.h;
                if (ann.type === 'rect' || ann.type === 'circle') {
                    if (w < 0) { x += w; w = Math.abs(w); }
                    if (h < 0) { y += h; h = Math.abs(h); }
                }

                return (
                    <g key={ann.id}>
                        <rect
                            x={x - 5}
                            y={y - 5}
                            width={w + 10}
                            height={h + 10}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="1.5"
                            strokeDasharray="4 2"
                            pointerEvents="none"
                        />
                        <>
                            {renderHandle(ann.id, x - 5, y - 5, 'nw-resize', 'nw')}
                            {renderHandle(ann.id, x + w + 5, y - 5, 'ne-resize', 'ne')}
                            {renderHandle(ann.id, x - 5, y + h + 5, 'sw-resize', 'sw')}
                            {renderHandle(ann.id, x + w + 5, y + h + 5, 'se-resize', 'se')}
                        </>
                    </g>
                );
            }) : (
                // Multi-selection Box
                (() => {
                    if (selectedAnns.length < 2) return null;
                    // ... (multi logic unchanged) ...
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    selectedAnns.forEach(ann => {
                        const b = getBounds(ann);
                        if (!b) return;
                        // ...
                        let bx = b.x, by = b.y, bw = b.w, bh = b.h;
                        if (bw < 0) { bx += bw; bw = Math.abs(bw); }
                        if (bh < 0) { by += bh; bh = Math.abs(bh); }

                        minX = Math.min(minX, bx);
                        minY = Math.min(minY, by);
                        maxX = Math.max(maxX, bx + bw);
                        maxY = Math.max(maxY, by + bh);
                    });

                    if (minX === Infinity) return null;
                    const w = maxX - minX;
                    const h = maxY - minY;

                    return (
                        <g>
                            <rect
                                x={minX - 5}
                                y={minY - 5}
                                width={w + 10}
                                height={h + 10}
                                fill="rgba(59, 130, 246, 0.05)"
                                stroke="#3b82f6"
                                strokeWidth="1.5"
                                strokeDasharray="4 2"
                                pointerEvents="none"
                            />
                            {renderHandle('MULTI', minX - 5, minY - 5, 'nw-resize', 'nw')}
                            {renderHandle('MULTI', minX + w + 5, minY - 5, 'ne-resize', 'ne')}
                            {renderHandle('MULTI', minX - 5, minY + h + 5, 'sw-resize', 'sw')}
                            {renderHandle('MULTI', minX + w + 5, minY + h + 5, 'se-resize', 'se')}
                        </g>
                    );
                })()
            )}

            {/* Marquee Selection Box */}
            {
                selectionBox && (
                    <rect
                        x={Math.min(selectionBox.startX, selectionBox.currentX)}
                        y={Math.min(selectionBox.startY, selectionBox.currentY)}
                        width={Math.abs(selectionBox.currentX - selectionBox.startX)}
                        height={Math.abs(selectionBox.currentY - selectionBox.startY)}
                        fill="rgba(59, 130, 246, 0.1)"
                        stroke="#3b82f6"
                        strokeWidth="1"
                    />
                )
            }

            {/* Editing Input Overlay */}
            {editingAnn && editingAnn.type === 'text' && (
                <AnnotationInput
                    ann={editingAnn}
                    onUpdate={onTextUpdate}
                    onBlur={onTextBlur}
                />
            )}
        </svg >
    );
};
