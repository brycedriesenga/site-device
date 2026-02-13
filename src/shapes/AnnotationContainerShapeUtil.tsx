
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
        url?: string
    }
>

export class AnnotationContainerShapeUtil extends BaseBoxShapeUtil<IAnnotationContainerShape> {
    static override type = 'annotation-container' as const
    static override props: RecordProps<IAnnotationContainerShape> = {
        w: T.number,
        h: T.number,
        url: T.string.optional(),
    }

    // Prevent direct selection of the container - it is just a structural grouping
    override canBind = () => false
    override canSnap = () => false
    override hideSelectionBoundsBg = () => true
    override hideSelectionBoundsFg = () => true
    override hideRotateHandle = () => true
    override hideResizeHandles = () => true

    override getDefaultProps(): IAnnotationContainerShape['props'] {
        return {
            w: 100,
            h: 100,
            url: '',
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
                {/* Transparent container for annotations - Pass clicks through */}
                <div style={{
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none'
                }} />
            </HTMLContainer>
        )
    }

    override indicator(_shape: IAnnotationContainerShape) {
        return null
    }
}
