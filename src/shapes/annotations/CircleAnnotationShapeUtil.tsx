import {
    BaseBoxShapeUtil,
    Geometry2d,
    Ellipse2d,
    HTMLContainer,
    T,
    type TLBaseShape,
    type RecordProps,
    type TLResizeInfo,
    resizeBox
} from 'tldraw'

export type ICircleAnnotation = TLBaseShape<
    'annotation-circle',
    {
        w: number
        h: number
        color: string
        strokeWidth: number
        fillColor: string
        fillOpacity: number
    }
>

export class CircleAnnotationShapeUtil extends BaseBoxShapeUtil<ICircleAnnotation> {
    static override type = 'annotation-circle' as const
    static override props: RecordProps<ICircleAnnotation> = {
        w: T.number,
        h: T.number,
        color: T.string,
        strokeWidth: T.number,
        fillColor: T.string,
        fillOpacity: T.number
    }

    override getDefaultProps(): ICircleAnnotation['props'] {
        return {
            w: 100,
            h: 100,
            color: '#3b82f6',
            strokeWidth: 2,
            fillColor: '#ffffff',
            fillOpacity: 0
        }
    }

    override getGeometry(shape: ICircleAnnotation): Geometry2d {
        return new Ellipse2d({
            width: shape.props.w,
            height: shape.props.h,
            isFilled: true
        })
    }

    override component(shape: ICircleAnnotation) {
        const { w, h, color, strokeWidth, fillColor, fillOpacity } = shape.props
        const cx = w / 2
        const cy = h / 2
        const rx = w / 2
        const ry = h / 2

        return (
            <HTMLContainer style={{ pointerEvents: 'all' }}>
                <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
                    <ellipse
                        cx={cx}
                        cy={cy}
                        rx={rx}
                        ry={ry}
                        fill={fillColor || 'none'}
                        fillOpacity={fillOpacity || 0}
                        stroke={color}
                        strokeWidth={strokeWidth}
                    />
                </svg>
            </HTMLContainer>
        )
    }

    override indicator(shape: ICircleAnnotation) {
        const cx = shape.props.w / 2
        const cy = shape.props.h / 2
        const rx = shape.props.w / 2
        const ry = shape.props.h / 2
        return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
    }

    override onResize = (shape: ICircleAnnotation, info: TLResizeInfo<ICircleAnnotation>) => {
        return resizeBox(shape, info)
    }
}
