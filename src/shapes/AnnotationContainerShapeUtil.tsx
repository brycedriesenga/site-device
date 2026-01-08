
import {
    BaseBoxShapeUtil,
    Geometry2d,
    HTMLContainer,
    Rectangle2d,
    T,
    type TLBaseShape,
    type RecordProps
} from 'tldraw'

export type IAnnotationContainerShape = TLBaseShape<
    'annotation-container',
    {
        w: number
        h: number
    }
>

export class AnnotationContainerShapeUtil extends BaseBoxShapeUtil<IAnnotationContainerShape> {
    static override type = 'annotation-container' as const
    static override props: RecordProps<IAnnotationContainerShape> = {
        w: T.number,
        h: T.number,
    }

    override getDefaultProps(): IAnnotationContainerShape['props'] {
        return {
            w: 100,
            h: 100,
        }
    }

    override getGeometry(shape: IAnnotationContainerShape): Geometry2d {
        return new Rectangle2d({
            width: shape.props.w,
            height: shape.props.h,
            isFilled: false,
        })
    }

    override component(_shape: IAnnotationContainerShape) {
        return (
            <HTMLContainer style={{ pointerEvents: 'none' }}>
                {/* Transparent container for annotations */}
                <div style={{
                    width: '100%',
                    height: '100%',
                    // border: '1px dashed rgba(0,0,0,0.1)', // Helpful for debugging
                }} />
            </HTMLContainer>
        )
    }

    override indicator(shape: IAnnotationContainerShape) {
        return <rect width={shape.props.w} height={shape.props.h} />
    }
}
