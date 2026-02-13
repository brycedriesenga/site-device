export interface Device {
    id: string
    name: string
    width: number
    height: number
    type: 'mobile' | 'tablet' | 'desktop'
    userAgent: string
    isolation?: boolean
    clientHints?: {
        platform: string
        mobile: boolean
        brands?: { brand: string; version: string }[]
    }
    x: number
    y: number
    zIndex?: number
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

// Legacy storage types kept for backward compatibility
// New persistence is handled by ChromeStorageAdapter and tldraw shapes
