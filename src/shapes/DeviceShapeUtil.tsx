import {
    BaseBoxShapeUtil,
    Geometry2d,
    HTMLContainer,
    type RecordProps,
    type TLResizeInfo,
    Rectangle2d,
    T,
    type TLBaseShape,
    resizeBox,
    useEditor,
    useValue
} from 'tldraw'
import { useState, useEffect } from 'react'

export type IDeviceShape = TLBaseShape<
    'device',
    {
        w: number
        h: number
        url: string
        name: string
        deviceType: 'mobile' | 'tablet' | 'desktop'
        userAgent: string
        pixelRatio: number
        clientHints?: {
            platform: string
            mobile: boolean
            brands?: { brand: string; version: string }[]
        }
    }
>

export class DeviceShapeUtil extends BaseBoxShapeUtil<IDeviceShape> {
    static override type = 'device' as const
    static override props: RecordProps<IDeviceShape> = {
        w: T.number,
        h: T.number,
        url: T.string,
        name: T.string,
        deviceType: T.literalEnum('mobile', 'tablet', 'desktop'),
        userAgent: T.string,
        pixelRatio: T.number
    }

    override getDefaultProps(): IDeviceShape['props'] {
        return {
            w: 375,
            h: 812,
            url: '',
            name: 'Mobile',
            deviceType: 'mobile',
            userAgent: '',
            pixelRatio: 1
        }
    }

    override getGeometry(shape: IDeviceShape): Geometry2d {
        return new Rectangle2d({
            width: shape.props.w,
            height: shape.props.h,
            isFilled: true,
        })
    }

    // Simple resizing with no constraints - full user flexibility
    override onResize = (shape: IDeviceShape, info: TLResizeInfo<IDeviceShape>) => {
        return resizeBox(shape, info)
    }

    override component(shape: IDeviceShape) {
        /* eslint-disable react-hooks/rules-of-hooks */
        const { w, h, url, name, userAgent, deviceType } = shape.props
        const editor = useEditor()
        const isSelected = useValue('isSelected', () => editor.getSelectedShapeIds().includes(shape.id), [editor, shape.id])

        const [isLoading, setIsLoading] = useState(true)

        useEffect(() => {
            if (url) setIsLoading(true)
        }, [url])
        /* eslint-enable react-hooks/rules-of-hooks */

        // Build iframe config
        const sdConf = {
            id: shape.id,
            ua: userAgent,
            ch: shape.props.clientHints || {},
            type: deviceType,
            w: w,
            h: h
        }
        const iframeName = `SD_CONF:${JSON.stringify(sdConf)}`

        return (
            <HTMLContainer style={{ pointerEvents: 'all' }}>
                <div style={{ width: '100%', height: '100%', pointerEvents: 'none', display: 'flex', flexDirection: 'column' }}>
                    <div className={`device-frame w-full h-full bg-white flex flex-col overflow-hidden relative rounded-lg transition-all shadow-sm ${
                        isSelected 
                            ? 'border-2 border-blue-500 shadow-lg' 
                            : 'border border-gray-200'
                    }`}>
                        {/* Device Header - shown when selected */}
                        {isSelected && (
                            <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 flex items-center justify-between">
                                <div>
                                    <div className="text-xs font-semibold text-blue-900">{name}</div>
                                    <div className="text-xs text-blue-700">{w} × {h} px</div>
                                </div>
                                <div className="text-xs font-medium text-blue-600 capitalize">{deviceType}</div>
                            </div>
                        )}

                        {/* Click shield for unselected state */}
                        {!isSelected && (
                            <div
                                className="absolute inset-0 z-50 bg-transparent"
                                style={{ pointerEvents: 'all' }}
                            />
                        )}

                        {/* Iframe container */}
                        <div className="flex-1 bg-white relative overflow-hidden">
                            {url ? (
                                <>
                                    {isLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 z-20">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-200 border-b-blue-500" />
                                                <span className="text-xs text-zinc-400 font-medium">Loading...</span>
                                            </div>
                                        </div>
                                    )}
                                    <iframe
                                        src={(function () {
                                            try {
                                                const u = new URL(url)
                                                u.searchParams.set('__sd_id', shape.id)
                                                return u.toString()
                                            } catch { 
                                                return url 
                                            }
                                        })()}
                                        onLoad={() => setIsLoading(false)}
                                        className="w-full h-full border-none pointer-events-auto"
                                        title={name}
                                        name={iframeName}
                                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                                    />
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-300 text-sm">
                                    No URL loaded
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </HTMLContainer>
        )
    }

    override indicator(shape: IDeviceShape) {
        return <rect width={shape.props.w} height={shape.props.h} />
    }
}
