import { StateNode, type TLEventHandlers } from 'tldraw';

export abstract class BaseDeviceTool extends StateNode {
    // Abstract properties that must be defined by subclasses
    abstract getDeviceType(): 'mobile' | 'tablet' | 'desktop';
    abstract getDimensions(): { w: number, h: number };

    static override id = 'base-device';
    static override initial = 'idle';
    static override children = () => [DeviceIdle, DevicePointing];
}

class DeviceIdle extends StateNode {
    static override id = 'idle';

    override onEnter = () => {
        this.editor.setCursor({ type: 'cross', rotation: 0 });
    };

    override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
        this.parent.transition('pointing', info);
    };

    override onCancel = () => {
        this.editor.setCurrentTool('select');
    };
}

class DevicePointing extends StateNode {
    static override id = 'pointing';

    override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
        const { x, y } = this.editor.inputs.currentPagePoint;
        const type = (this.parent as BaseDeviceTool).getDeviceType();
        const { w, h } = (this.parent as BaseDeviceTool).getDimensions();

        // Trigger the creation event
        // We'll dispatch a custom event that TldrawApp listens to, 
        // passing the coordinates and type.
        window.dispatchEvent(new CustomEvent('tldraw-add-device-at-point', {
            detail: { x, y, type, w, h }
        }));

        // Return to select tool
        this.editor.setCurrentTool('select');
    };

    override onCancel = () => {
        this.editor.setCurrentTool('select');
    };
}
