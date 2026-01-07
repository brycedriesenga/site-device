
import {
    BaseBoxShapeUtil,
    Geometry2d,
    Rectangle2d,
    HTMLContainer,
    T,
    type TLBaseShape
} from 'tldraw'

export type IAnnotationShape = TLBaseShape<
    'annotation-container',
    {
        w: number
        h: number
        url: string
    }
>

export class AnnotationShapeUtil extends BaseBoxShapeUtil<IAnnotationShape> {
    static override type = 'annotation-container' as const
    static override props = {
        w: T.number,
        h: T.number,
        url: T.string,
    }

    override getDefaultProps(): IAnnotationShape['props'] {
        return {
            w: 100,
            h: 100,
            url: '',
        }
    }

    override getGeometry(shape: IAnnotationShape): Geometry2d {
        return new Rectangle2d({
            width: shape.props.w,
            height: shape.props.h,
            isFilled: false,
        })
    }

    override component(_shape: IAnnotationShape) {
        return (
            <HTMLContainer style={{ pointerEvents: 'none' }}>
                <div
                    className="annotation-debug-border"
                    style={{
                        width: '100%',
                        height: '100%',
                        // border: '1px dashed rgba(255,0,0,0.2)', // Debug helpful for now
                        pointerEvents: 'none'
                    }}
                />
            </HTMLContainer>
        )
    }

    override indicator(shape: IAnnotationShape) {
        return <rect width={shape.props.w} height={shape.props.h} />
    }
}
