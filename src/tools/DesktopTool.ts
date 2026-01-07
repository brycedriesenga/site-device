import { BaseDeviceTool } from './BaseDeviceTool';

export class DesktopTool extends BaseDeviceTool {
    static override id = 'tool-desktop';

    override getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
        return 'desktop';
    }

    override getDimensions() {
        return { w: 1440, h: 900 };
    }
}
