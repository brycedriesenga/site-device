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

export type ITextAnnotation = TLBaseShape<
    'annotation-text',
    {
        w: number
        h: number
        text: string
        color: string
        fontSize: number
        fontFamily: string
        textAlign: 'left' | 'center' | 'right'
    }
>

export class TextAnnotationShapeUtil extends BaseBoxShapeUtil<ITextAnnotation> {
    static override type = 'annotation-text' as const
    static override props: RecordProps<ITextAnnotation> = {
        w: T.number,
        h: T.number,
        text: T.string,
        color: T.string,
        fontSize: T.number,
        fontFamily: T.string,
        textAlign: T.literalEnum('left', 'center', 'right')
    }

    override getDefaultProps(): ITextAnnotation['props'] {
        return {
            w: 200,
            h: 50,
            text: 'Text annotation',
            color: '#1f2937',
            fontSize: 16,
            fontFamily: 'sans-serif',
            textAlign: 'left'
        }
    }

    override getGeometry(shape: ITextAnnotation): Geometry2d {
        return new Rectangle2d({
            width: shape.props.w,
            height: shape.props.h,
            isFilled: true
        })
    }

    override component(shape: ITextAnnotation) {
        const { w, h, text, color, fontSize, fontFamily, textAlign } = shape.props

        return (
            <HTMLContainer style={{ pointerEvents: 'all' }}>
                <div
                    style={{
                        width: `${w}px`,
                        height: `${h}px`,
                        color: color,
                        fontSize: `${fontSize}px`,
                        fontFamily: fontFamily,
                        textAlign: textAlign,
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px',
                        wordWrap: 'break-word',
                        overflow: 'hidden',
                        whiteSpace: 'pre-wrap',
                        userSelect: 'text',
                        cursor: 'text'
                    }}
                >
                    {text}
                </div>
            </HTMLContainer>
        )
    }

    override indicator(shape: ITextAnnotation) {
        return <rect width={shape.props.w} height={shape.props.h} />
    }

    override onResize = (shape: ITextAnnotation, info: TLResizeInfo<ITextAnnotation>) => {
        return resizeBox(shape, info)
    }
}
