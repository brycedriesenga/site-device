import {
    BaseBoxShapeUtil,
    Geometry2d,
    HTMLContainer,
    type RecordProps,
    Rectangle2d,
    T,
    type TLBaseShape,
    resizeBox,
    useEditor,
    useValue
} from 'tldraw'


export type IDeviceShape = TLBaseShape<
    'device',
    {
        w: number
        h: number
        url: string
        name: string
        deviceType: string // 'mobile' | 'tablet' | 'desktop'
        userAgent: string
        pixelRatio: number
    }
>

export class DeviceShapeUtil extends BaseBoxShapeUtil<IDeviceShape> {
    static override type = 'device' as const
    static override props: RecordProps<IDeviceShape> = {
        w: T.number,
        h: T.number,
        url: T.string,
        name: T.string,
        deviceType: T.string,
        userAgent: T.string,
        pixelRatio: T.number,
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

    override component(shape: IDeviceShape) {
        const { w, h, url, name, userAgent, deviceType } = shape.props
        const editor = useEditor()
        const isSelected = useValue('isSelected', () => editor.getSelectedShapeIds().includes(shape.id), [editor, shape.id])

        // Construct Isolation Config
        const sdConf = {
            id: shape.id,
            ua: userAgent,
            ch: {}, // TODO: Add client hints support
            type: deviceType,
            w: w,
            h: h
        }
        const iframeName = `SD_CONF:${JSON.stringify(sdConf)}`

        return (
            <HTMLContainer style={{ pointerEvents: 'all' }}>
                <div style={{ width: '100%', height: '100%', pointerEvents: 'none', display: 'flex', flexDirection: 'column' }}>
                    <div className="device-frame w-full h-full bg-white border border-gray-200 flex flex-col overflow-hidden relative shadow-sm rounded-lg">

                        {!isSelected && (
                            <div
                                className="absolute inset-0 z-50 bg-transparent"
                                style={{ pointerEvents: 'all' }}
                            />
                        )}

                        <div className="flex-1 bg-white relative">
                            {url ? (
                                <iframe
                                    src={(function () {
                                        try {
                                            const u = new URL(url);
                                            u.searchParams.set('__sd_id', shape.id);
                                            return u.toString();
                                        } catch (e) { return url; }
                                    })()}
                                    className="w-full h-full border-none pointer-events-auto"
                                    title={name}
                                    name={iframeName}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-300 text-sm">
                                    No URL
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

    // Allow resizing
    override onResize = (shape: IDeviceShape, info: any) => {
        return resizeBox(shape, info)
    }
}
