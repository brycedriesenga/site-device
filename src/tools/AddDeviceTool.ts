import { StateNode } from 'tldraw';

class AddDeviceIdle extends StateNode {
    static override id = 'idle';

    override onEnter() {
        // Trigger the Add Device logic immediately upon entering the Idle state
        // This effectively makes the tool a "one-shot" action
        window.dispatchEvent(new CustomEvent('tldraw-add-device-trigger'));

        // Immediately return to select tool
        // We use a small timeout to ensure the transition doesn't conflict with any mounting logic
        process.nextTick(() => {
            this.editor.setCurrentTool('select');
        });
    }
}

export class AddDeviceTool extends StateNode {
    static override id = 'add-device';
    static override initial = 'idle';
    static override children = () => [AddDeviceIdle];
}
