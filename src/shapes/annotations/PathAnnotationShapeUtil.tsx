import {
    BaseBoxShapeUtil,
    Geometry2d,
    Polyline2d,
    HTMLContainer,
    T,
    type TLBaseShape,
    type RecordProps,
    type TLResizeInfo,
    resizeBox,
    Vec
} from 'tldraw'

export type IPathAnnotation = TLBaseShape<
    'annotation-path',
    {
        w: number
        h: number
        points: number[]
        color: string
        strokeWidth: number
        smooth: boolean
    }
>

export class PathAnnotationShapeUtil extends BaseBoxShapeUtil<IPathAnnotation> {
    static override type = 'annotation-path' as const
    static override props: RecordProps<IPathAnnotation> = {
        w: T.number,
        h: T.number,
        points: T.arrayOf(T.number),
        color: T.string,
        strokeWidth: T.number,
        smooth: T.boolean
    }

    override getDefaultProps(): IPathAnnotation['props'] {
        return {
            w: 100,
            h: 100,
            points: [0, 0, 50, 25, 100, 0],
            color: '#10b981',
            strokeWidth: 2,
            smooth: false
        }
    }

    override getGeometry(shape: IPathAnnotation): Geometry2d {
        const { points } = shape.props
        const vecPoints: Vec[] = []
        for (let i = 0; i < points.length; i += 2) {
            vecPoints.push(new Vec(points[i], points[i + 1]))
        }
        return new Polyline2d({
            points: vecPoints.length > 0 ? vecPoints : [new Vec(0, 0)]
        })
    }

    private pointsToPath(points: number[], smooth: boolean): string {
        if (points.length < 2) return ''

        let path = `M ${points[0]} ${points[1]}`

        if (smooth && points.length >= 6) {
            for (let i = 2; i < points.length; i += 2) {
                if (i + 1 < points.length) {
                    const cpx1 = points[i]
                    const cpy1 = points[i + 1]
                    const x = points[i]
                    const y = points[i + 1]
                    path += ` Q ${cpx1} ${cpy1}, ${x} ${y}`
                }
            }
        } else {
            for (let i = 2; i < points.length; i += 2) {
                path += ` L ${points[i]} ${points[i + 1]}`
            }
        }

        return path
    }

    override component(shape: IPathAnnotation) {
        const { w, h, points, color, strokeWidth, smooth } = shape.props

        const pathData = this.pointsToPath(points, smooth)

        return (
            <HTMLContainer style={{ pointerEvents: 'all' }}>
                <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
                    <path
                        d={pathData}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </HTMLContainer>
        )
    }

    override indicator(shape: IPathAnnotation) {
        return <rect width={shape.props.w} height={shape.props.h} />
    }

    override onResize = (shape: IPathAnnotation, info: TLResizeInfo<IPathAnnotation>) => {
        return resizeBox(shape, info)
    }
}
