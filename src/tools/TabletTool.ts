import { BaseDeviceTool } from './BaseDeviceTool';

export class TabletTool extends BaseDeviceTool {
    static override id = 'tool-tablet';

    override getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
        return 'tablet';
    }

    override getDimensions() {
        return { w: 820, h: 1180 };
    }
}
