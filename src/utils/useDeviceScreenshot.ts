import { useCallback, useRef } from 'react'
import type { Editor } from 'tldraw'
import { DeviceScreenshotter, type ScreenshotType } from './DeviceScreenshotter'

const THROTTLE_MS = 500

export function useDeviceScreenshot(editor: Editor | null) {
    const isCapturingRef = useRef(false)
    const lastCaptureAtRef = useRef(0)

    return useCallback(
        async (deviceId: string, type: ScreenshotType) => {
            if (!editor) return

            const now = Date.now()
            if (isCapturingRef.current) {
                console.warn('[SiteDevice][Screenshot] Capture already in progress')
                return
            }

            // Lightweight throttle to avoid overlapping camera/shape updates.
            if (now - lastCaptureAtRef.current < THROTTLE_MS) {
                console.warn('[SiteDevice][Screenshot] Capture throttled')
                return
            }

            isCapturingRef.current = true

            const screenshotter = new DeviceScreenshotter(editor)
            try {
                await screenshotter.capture(deviceId, { type })
                lastCaptureAtRef.current = Date.now()
            } catch (error) {
                console.error('[SiteDevice][Screenshot] Capture failed', error)
                alert(`Screenshot failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
            } finally {
                isCapturingRef.current = false
            }
        },
        [editor]
    )
}
