import {
    BaseBoxShapeUtil,
    Geometry2d,
    Rectangle2d,
    T,
    type TLBaseShape,
    type RecordProps
} from 'tldraw'

export type IViewportFrameShape = TLBaseShape<
    'viewport-frame',
    {
        w: number
        h: number
        name: string
    }
>

/**
 * A custom frame shape for annotation viewport clipping.
 * Unlike standard frames, this doesn't intercept clicks/selection.
 * It's purely for clipping annotations to the device viewport.
 */
export class ViewportFrameShapeUtil extends BaseBoxShapeUtil<IViewportFrameShape> {
    static override type = 'viewport-frame' as const
    static override props: RecordProps<IViewportFrameShape> = {
        w: T.number,
        h: T.number,
        name: T.string,
    }

    // Prevent ALL interactions - this is just a clipping container
    override canBind = () => false
    override canSnap = () => false
    override canEdit = () => false
    override canResize = () => false
    override hideSelectionBoundsBg = () => true
    override hideSelectionBoundsFg = () => true
    override hideRotateHandle = () => true
    override hideResizeHandles = () => true
    override isAspectRatioLocked = () => true

    override getGeometry(shape: IViewportFrameShape): Geometry2d {
        // Keep proper geometry for clipping to work
        return new Rectangle2d({
            width: shape.props.w,
            height: shape.props.h,
            isFilled: false,
        })
    }

    override getDefaultProps(): IViewportFrameShape['props'] {
        return {
            w: 100,
            h: 100,
            name: '',
        }
    }

    // Don't render anything - this shape is purely for clipping structure
    override component() {
        return null
    }

    override indicator() {
        return null
    }
}
