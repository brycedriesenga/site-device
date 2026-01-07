import {
    BaseBoxShapeUtil,
    Geometry2d,
    HTMLContainer,
    Rectangle2d,
    T,
    type RecordProps,
    type TLBaseShape,
    type TLResizeInfo,
    resizeBox,
} from 'tldraw'

export type IAnnotationContainer = TLBaseShape<
    'annotation-container',
    {
        w: number
        h: number
    }
>

export class AnnotationContainerShapeUtil extends BaseBoxShapeUtil<IAnnotationContainer> {
    static override type = 'annotation-container' as const

    static override props: RecordProps<IAnnotationContainer> = {
        w: T.number,
        h: T.number,
    }

    override getDefaultProps(): IAnnotationContainer['props'] {
        return {
            w: 100,
            h: 100,
        }
    }

    override getGeometry(shape: IAnnotationContainer): Geometry2d {
        return new Rectangle2d({
            width: shape.props.w,
            height: shape.props.h,
            isFilled: false,
        })
    }

    override component(shape: IAnnotationContainer) {
        void shape
        return (
            <HTMLContainer style={{ pointerEvents: 'all' }}>
                <div className="w-full h-full bg-transparent" />
            </HTMLContainer>
        )
    }

    override indicator(shape: IAnnotationContainer) {
        return <rect width={shape.props.w} height={shape.props.h} />
    }

    override onResize = (shape: IAnnotationContainer, info: TLResizeInfo<IAnnotationContainer>) => {
        return resizeBox(shape, info)
    }
}
