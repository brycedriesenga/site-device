import { BaseDeviceTool } from './BaseDeviceTool';

export class MobileTool extends BaseDeviceTool {
    static override id = 'tool-mobile';

    override getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
        return 'mobile';
    }

    override getDimensions() {
        return { w: 393, h: 852 };
    }
}
