export interface Device {
    id: string;
    name: string;
    width: number;
    height: number;
    type: 'mobile' | 'tablet' | 'desktop';
    userAgent: string;
    isolation?: boolean;
    clientHints?: {
        platform: string;
        mobile: boolean;
        brands: { brand: string; version: string }[];
    };
    x: number;
    y: number;
    zIndex?: number;
}

export interface CanvasState {
    scale: number;
    x: number;
    y: number;
    // background?: string; // Deprecated
    bgColor: string;
    pattern: 'none' | 'dots' | 'grid';
    patternColor: string;
}

export interface StorageState {
    devices: Device[];
    canvas: CanvasState;
    url: string;
    recentUrls: string[];
    theme: 'light' | 'dark';
}

export type AnnotationTool = 'select' | 'pen' | 'rect' | 'circle' | 'arrow' | 'text' | 'eraser';

export interface Annotation {
    id: string;
    type: 'path' | 'rect' | 'circle' | 'arrow' | 'text';
    color: string;
    strokeWidth: number;
    points?: number[]; // For path (flat array [x1, y1, x2, y2...])
    x?: number;        // For shapes/text
    y?: number;
    width?: number;    // For shapes
    height?: number;
    content?: string;  // For text
    fontSize?: number;
    startX?: number;   // For arrow
    startY?: number;
    endX?: number;
    endY?: number;
    controlX?: number;
    controlY?: number;
}
