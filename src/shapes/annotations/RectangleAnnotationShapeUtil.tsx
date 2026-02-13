import {
    BaseBoxShapeUtil,
    Geometry2d,
    Rectangle2d,
    HTMLContainer,
    T,
    type TLBaseShape,
    type RecordProps,
    type TLResizeInfo,
    resizeBox
} from 'tldraw'

export type IRectangleAnnotation = TLBaseShape<
    'annotation-rect',
    {
        w: number
        h: number
        color: string
        strokeWidth: number
        fillColor: string
        fillOpacity: number
    }
>

export class RectangleAnnotationShapeUtil extends BaseBoxShapeUtil<IRectangleAnnotation> {
    static override type = 'annotation-rect' as const
    static override props: RecordProps<IRectangleAnnotation> = {
        w: T.number,
        h: T.number,
        color: T.string,
        strokeWidth: T.number,
        fillColor: T.string,
        fillOpacity: T.number
    }

    override getDefaultProps(): IRectangleAnnotation['props'] {
        return {
            w: 100,
            h: 100,
            color: '#ef4444',
            strokeWidth: 2,
            fillColor: '#ffffff',
            fillOpacity: 0
        }
    }

    override getGeometry(shape: IRectangleAnnotation): Geometry2d {
        return new Rectangle2d({
            width: shape.props.w,
            height: shape.props.h,
            isFilled: true
        })
    }

    override component(shape: IRectangleAnnotation) {
        const { w, h, color, strokeWidth, fillColor, fillOpacity } = shape.props
        return (
            <HTMLContainer style={{ pointerEvents: 'all' }}>
                <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
                    <rect
                        x={0}
                        y={0}
                        width={w}
                        height={h}
                        fill={fillColor || 'none'}
                        fillOpacity={fillOpacity || 0}
                        stroke={color}
                        strokeWidth={strokeWidth}
                    />
                </svg>
            </HTMLContainer>
        )
    }

    override indicator(shape: IRectangleAnnotation) {
        return <rect width={shape.props.w} height={shape.props.h} />
    }

    override onResize = (shape: IRectangleAnnotation, info: TLResizeInfo<IRectangleAnnotation>) => {
        return resizeBox(shape, info)
    }
}
