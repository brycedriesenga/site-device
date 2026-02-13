import {
    BaseBoxShapeUtil,
    Geometry2d,
    Group2d,
    Polyline2d,
    Rectangle2d,
    HTMLContainer,
    T,
    type TLBaseShape,
    type RecordProps,
    type TLResizeInfo,
    resizeBox,
    Vec
} from 'tldraw'

export type IArrowAnnotation = TLBaseShape<
    'annotation-arrow',
    {
        w: number
        h: number
        color: string
        strokeWidth: number
        arrowheadStart: boolean
        arrowheadEnd: boolean
    }
>

export class ArrowAnnotationShapeUtil extends BaseBoxShapeUtil<IArrowAnnotation> {
    static override type = 'annotation-arrow' as const
    static override props: RecordProps<IArrowAnnotation> = {
        w: T.number,
        h: T.number,
        color: T.string,
        strokeWidth: T.number,
        arrowheadStart: T.boolean,
        arrowheadEnd: T.boolean
    }

    override getDefaultProps(): IArrowAnnotation['props'] {
        return {
            w: 100,
            h: 100,
            color: '#8b5cf6',
            strokeWidth: 2,
            arrowheadStart: false,
            arrowheadEnd: true
        }
    }

    override getGeometry(shape: IArrowAnnotation): Geometry2d {
        const { w, h } = shape.props
        const line = new Polyline2d({
            points: [new Vec(0, 0), new Vec(w, h)]
        })
        return new Group2d({
            children: [line, new Rectangle2d({ width: w, height: h, isFilled: false })]
        })
    }

    private renderArrowhead(x: number, y: number, angle: number, size: number) {
        const arrowLength = size

        const p1x = x + arrowLength * Math.cos(angle - Math.PI / 6)
        const p1y = y + arrowLength * Math.sin(angle - Math.PI / 6)
        const p2x = x + arrowLength * Math.cos(angle + Math.PI / 6)
        const p2y = y + arrowLength * Math.sin(angle + Math.PI / 6)

        return `M ${x} ${y} L ${p1x} ${p1y} M ${x} ${y} L ${p2x} ${p2y}`
    }

    override component(shape: IArrowAnnotation) {
        const { w, h, color, strokeWidth, arrowheadStart, arrowheadEnd } = shape.props

        const x1 = 0
        const y1 = 0
        const x2 = w
        const y2 = h

        const angle = Math.atan2(y2 - y1, x2 - x1)
        const arrowSize = Math.max(10, strokeWidth * 5)

        return (
            <HTMLContainer style={{ pointerEvents: 'all' }}>
                <svg width={Math.abs(w)} height={Math.abs(h)} viewBox={`0 0 ${Math.abs(w)} ${Math.abs(h)}`}>
                    <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                    />
                    {arrowheadStart && (
                        <path
                            d={this.renderArrowhead(x1, y1, angle + Math.PI, arrowSize)}
                            stroke={color}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            fill="none"
                        />
                    )}
                    {arrowheadEnd && (
                        <path
                            d={this.renderArrowhead(x2, y2, angle, arrowSize)}
                            stroke={color}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            fill="none"
                        />
                    )}
                </svg>
            </HTMLContainer>
        )
    }

    override indicator(shape: IArrowAnnotation) {
        return <rect width={shape.props.w} height={shape.props.h} />
    }

    override onResize = (shape: IArrowAnnotation, info: TLResizeInfo<IArrowAnnotation>) => {
        return resizeBox(shape, info)
    }
}
