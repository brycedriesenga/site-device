export interface DevicePreset {
    name: string
    type: 'mobile' | 'tablet' | 'desktop'
    width: number
    height: number
    userAgent: string
    clientHints?: {
        platform: string
        mobile: boolean
        brands?: { brand: string; version: string }[]
    }
}

export const DEVICE_PRESETS: Record<string, DevicePreset> = {
    iphone14pro: {
        name: 'iPhone 14 Pro',
        type: 'mobile',
        width: 393,
        height: 852,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        clientHints: { platform: 'iOS', mobile: true }
    },
    iphone12: {
        name: 'iPhone 12/13',
        type: 'mobile',
        width: 390,
        height: 844,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        clientHints: { platform: 'iOS', mobile: true }
    },
    pixel6: {
        name: 'Pixel 6',
        type: 'mobile',
        width: 412,
        height: 915,
        userAgent: 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        clientHints: { platform: 'Android', mobile: true }
    },
    ipadpro12: {
        name: 'iPad Pro 12.9"',
        type: 'tablet',
        width: 1024,
        height: 1366,
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        clientHints: { platform: 'iPadOS', mobile: true }
    },
    ipadpro11: {
        name: 'iPad Pro 11"',
        type: 'tablet',
        width: 820,
        height: 1180,
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        clientHints: { platform: 'iPadOS', mobile: true }
    },
    desktopwindows: {
        name: 'Desktop (Windows)',
        type: 'desktop',
        width: 1440,
        height: 900,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        clientHints: { platform: 'Windows', mobile: false }
    },
    desktopmac: {
        name: 'Desktop (Mac)',
        type: 'desktop',
        width: 1440,
        height: 900,
        userAgent: navigator.userAgent,
        clientHints: { platform: 'macOS', mobile: false }
    }
}

export function getPresetByType(type: 'mobile' | 'tablet' | 'desktop'): DevicePreset {
    const presets = Object.values(DEVICE_PRESETS).filter(p => p.type === type)
    return presets[0] || DEVICE_PRESETS.desktopwindows
}
