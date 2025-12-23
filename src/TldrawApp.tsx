import { useEffect, useState } from 'react';
import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';
import { DeviceShapeUtil } from './shapes/DeviceShapeUtil';
import { GlobalControls } from './components/GlobalControls';
import { loadState } from './utils/storage';
import type { Device } from './types';
import { ContextualToolbar } from './components/ContextualToolbar';

const shapeUtils = [DeviceShapeUtil];
const components = {
    InFrontOfTheCanvas: ContextualToolbar
}

// Preset definitions
const PRESETS = {
    mobile: { w: 393, h: 852, name: 'Mobile', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1' },
    tablet: { w: 820, h: 1180, name: 'Tablet', ua: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1' },
    desktop: { w: 1440, h: 900, name: 'Desktop', ua: navigator.userAgent }
};

export default function TldrawApp() {
    const [isReady, setIsReady] = useState(false);
    const [initialState, setInitialState] = useState<{ devices: Device[], url: string } | null>(null);
    const [activeUrl, setActiveUrl] = useState('');
    const [editor, setEditor] = useState<any>(null);
    const [hideStylePanel, setHideStylePanel] = useState(true);

    useEffect(() => {
        const init = async () => {
            try {
                const state = await loadState();
                setInitialState({
                    devices: state.devices || [],
                    url: state.url || ''
                });
                setActiveUrl(state.url || '');
                setIsReady(true);
            } catch (e) {
                console.error("Failed to load state", e);
                setIsReady(true);
            }
        };
        init();
    }, []);

    const handleMount = (editorInstance: any) => {
        setEditor(editorInstance);

        const init = async () => {
            // SYNC RULES BEFORE CREATING SHAPES to prevent race condition
            if (initialState?.devices && initialState.devices.length > 0) {
                const devicesPayload = initialState.devices.map(d => ({
                    id: `shape:${d.id}`,
                    userAgent: d.userAgent || (d.type === 'mobile' ? PRESETS.mobile.ua : (d.type === 'tablet' ? PRESETS.tablet.ua : PRESETS.desktop.ua)),
                    isolation: true
                }));

                // Wait for rules to update
                await new Promise<void>(resolve => {
                    chrome.runtime.sendMessage({
                        type: 'UPDATE_UA_RULES',
                        devices: devicesPayload
                    }, () => resolve());
                });
            }

            // Initialize Devices as Shapes
            if (initialState?.devices && editorInstance.getCurrentPageShapes().length === 0) {
                const shapes = initialState.devices.map(device => ({
                    id: `shape:${device.id}`, // Tldraw IDs must be unique
                    type: 'device',
                    x: device.x,
                    y: device.y,
                    props: {
                        w: device.width,
                        h: device.height,
                        url: initialState.url,
                        name: device.name,
                        deviceType: device.type,
                        userAgent: device.userAgent,
                        pixelRatio: 1 // TODO: Store this
                    }
                }));

                editorInstance.createShapes(shapes);
                editorInstance.zoomToFit();
            }
        };

        init();

        // Listen for changes
        editorInstance.store.listen(() => {
            const selected = editorInstance.getSelectedShapes();
            setHideStylePanel(selected.length === 0);

            // Sync devices to background for DNR rules
            const shapes = editorInstance.getCurrentPageShapes();
            const deviceShapes = shapes.filter((s: any) => s.type === 'device');
            const devicesPayload = deviceShapes.map((s: any) => ({
                id: s.id,
                userAgent: s.props.userAgent,
                isolation: true
            }));

            // We don't await here because it's reactive, but ideally this runs often enough
            chrome.runtime.sendMessage({
                type: 'UPDATE_UA_RULES',
                devices: devicesPayload
            });
        });
    };

    // Actions
    const handleUrlChange = (newUrl: string) => {
        setActiveUrl(newUrl);
        if (editor) {
            const updates: any[] = [];
            editor.getCurrentPageShapes().forEach((shape: any) => {
                if (shape.type === 'device') {
                    updates.push({
                        id: shape.id,
                        type: 'device',
                        props: { url: newUrl }
                    });
                }
            });
            if (updates.length > 0) editor.updateShapes(updates);
        }
    };

    const handleAddDevice = async (type: 'mobile' | 'tablet' | 'desktop') => {
        if (!editor) return;
        // @ts-ignore
        const preset = PRESETS[type];
        const center = editor.getViewportPageBounds().center;

        // Sync rules for the NEW device before creating it
        // We need to predict the ID. Tldraw generates IDs, but editor.createShape returns the shape?
        // Actually editor.createShape returns the ShapeId if we provide it, or generates one.
        // Let's generate one manually to be safe.
        const id = `shape:device_${Date.now()}`;

        // Get existing devices
        const shapes = editor.getCurrentPageShapes();
        const deviceShapes = shapes.filter((s: any) => s.type === 'device');
        const existingPayload = deviceShapes.map((s: any) => ({
            id: s.id,
            userAgent: s.props.userAgent,
            isolation: true
        }));

        const newDevicePayload = {
            id: id,
            userAgent: preset.ua,
            isolation: true
        };

        const allDevices = [...existingPayload, newDevicePayload];

        // Send rules and WAIT
        await new Promise<void>(resolve => {
            chrome.runtime.sendMessage({
                type: 'UPDATE_UA_RULES',
                devices: allDevices
            }, () => resolve());
        });

        editor.createShape({
            id: id,
            type: 'device',
            x: center.x - preset.w / 2,
            y: center.y - preset.h / 2,
            props: {
                w: preset.w,
                h: preset.h,
                url: activeUrl,
                name: preset.name,
                deviceType: type,
                userAgent: preset.ua,
                pixelRatio: 1
            }
        });
    };

    const handleRefresh = () => {
        if (editor) {
            editor.getCurrentPageShapes().forEach((shape: any) => {
                if (shape.type === 'device') {
                    // Attempt to reload iframe via DOM
                    const iframe = document.querySelector(`iframe[name*="${shape.id}"]`) as HTMLIFrameElement;
                    if (iframe) {
                        try {
                            iframe.contentWindow?.location.reload();
                        } catch (e) {
                            // If cross-origin restrictions apply, we might just have to reset src
                            iframe.src = iframe.src;
                        }
                    }
                }
            });
        }
    };

    const clearSiteData = async (dataType: 'cache' | 'cookies' | 'storage') => {
        if (!activeUrl) return;
        try {
            await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    type: 'CLEAR_DATA',
                    url: activeUrl,
                    dataType
                }, (response) => {
                    if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                    else if (response && !response.success) reject(response.error);
                    else resolve(response);
                });
            });
            // Optional: flash success? for now just log
            console.log(`Cleared ${dataType} for ${activeUrl}`);
        } catch (e) {
            console.error(`Failed to clear ${dataType}`, e);
            alert(`Failed to clear ${dataType}: ${e}`);
        }
    };

    const handleClearCache = () => clearSiteData('cache');
    const handleClearCookies = () => clearSiteData('cookies');
    const handleClearStorage = () => clearSiteData('storage');

    const handleOpenSettings = () => {
        alert('Global Settings not implemented yet. You can configure individual devices via their headers.');
    };

    if (!isReady) return <div className="w-screen h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className={`w-screen h-screen absolute inset-0 overflow-hidden ${hideStylePanel ? 'hide-style-panel' : ''}`}>
            <GlobalControls
                url={activeUrl}
                onUrlChange={handleUrlChange}
                onAddDevice={handleAddDevice}
                onRefresh={handleRefresh}

                onClearCache={handleClearCache}
                onClearCookies={handleClearCookies}
                onClearStorage={handleClearStorage}
                onOpenSettings={handleOpenSettings} />
            <Tldraw
                shapeUtils={shapeUtils}
                components={components}
                onMount={handleMount}
                persistenceKey="site-device-tldraw"
            />
        </div>
    );
}
