import { useRef, useMemo, useEffect, useState } from 'react';
import {
    Tldraw,

} from 'tldraw';
import type { TLUiOverrides } from 'tldraw';
import 'tldraw/tldraw.css';
import { DeviceShapeUtil } from './shapes/DeviceShapeUtil';
import { AnnotationShapeUtil } from './shapes/AnnotationShapeUtil';
import { GlobalControls } from './components/GlobalControls';
import { FocusOverlay } from './components/FocusOverlay';
import { loadState } from './utils/storage';
import type { Device } from './types';
import { ContextualToolbar } from './components/ContextualToolbar';
import { VerticalToolbar } from './components/VerticalToolbar';
import { MobileTool, TabletTool, DesktopTool } from './tools';

const shapeUtils = [DeviceShapeUtil, AnnotationShapeUtil];
const customTools = [MobileTool, TabletTool, DesktopTool];

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
    const [recentUrls, setRecentUrls] = useState<string[]>([]);

    // Annotation Focus Mode
    const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
    const editingDeviceIdRef = useRef<string | null>(null);

    // Pass handler to toolbar
    const components = useMemo(() => ({
        InFrontOfTheCanvas: (props: any) => (
            <div className="floating-ui-layer pointer-events-none absolute inset-0 overflow-hidden">

                <ContextualToolbar
                    {...props}
                    onEnterAnnotationMode={(deviceId: string, _containerId: string) => {
                        setEditingDeviceId(deviceId);
                        editingDeviceIdRef.current = deviceId;
                    }}
                />

                {/* Focus Overlay - Absolute positioned inside canvas container */}
                <FocusOverlay focusedDeviceId={editingDeviceIdRef.current} />

                <VerticalToolbar />
            </div>
        ),

    }), [editingDeviceId]);

    // UI Overrides
    const uiOverrides: TLUiOverrides = useMemo(() => ({
        tools(_editor, tools) {
            return {
                ...tools,
                'tool-mobile': {
                    id: 'tool-mobile',
                    label: 'Mobile',
                    kbd: 'm',
                    icon: 'device-mobile',
                    onSelect: () => _editor.setCurrentTool('tool-mobile')
                },
                'tool-tablet': {
                    id: 'tool-tablet',
                    label: 'Tablet',
                    kbd: 't',
                    icon: 'device-tablet',
                    onSelect: () => _editor.setCurrentTool('tool-tablet')
                },
                'tool-desktop': {
                    id: 'tool-desktop',
                    label: 'Desktop',
                    kbd: 'd',
                    icon: 'device-desktop',
                    onSelect: () => _editor.setCurrentTool('tool-desktop')
                }
            };
        },
    }), []);

    // Listen for device placement from tools
    useEffect(() => {
        const handleAddAtPoint = async (e: any) => {
            if (!editor) return;
            const { x, y, type, w, h } = e.detail;

            // @ts-ignore
            const preset = PRESETS[type]; // Get UA strings from preset
            const id = `shape:device_${Date.now()}`;

            // Register UA rules
            const shapes = editor.getCurrentPageShapes();
            const deviceShapes = shapes.filter((s: any) => s.type === 'device');
            const existingPayload = deviceShapes.map((s: any) => ({ id: s.id, userAgent: s.props.userAgent, isolation: true }));
            const newDevicePayload = { id: id, userAgent: preset.ua, isolation: true };
            const allDevices = [...existingPayload, newDevicePayload];

            await new Promise<void>(resolve => {
                chrome.runtime.sendMessage({
                    type: 'UPDATE_UA_RULES',
                    devices: allDevices
                }, () => resolve());
            });

            editor.createShape({
                id: id,
                type: 'device',
                x: x - w / 2, // Center on point
                y: y - h / 2,
                props: {
                    w: w,
                    h: h,
                    url: activeUrl,
                    name: preset.name,
                    deviceType: type,
                    userAgent: preset.ua,
                    pixelRatio: 1
                }
            });
        };

        window.addEventListener('tldraw-add-device-at-point', handleAddAtPoint);
        return () => window.removeEventListener('tldraw-add-device-at-point', handleAddAtPoint);
    }, [editor, activeUrl]);

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
            if (initialState?.devices && initialState.devices.length > 0) {
                const devicesPayload = initialState.devices.map(d => ({
                    id: `shape:${d.id}`,
                    userAgent: d.userAgent || (d.type === 'mobile' ? PRESETS.mobile.ua : (d.type === 'tablet' ? PRESETS.tablet.ua : PRESETS.desktop.ua)),
                    isolation: true
                }));
                await new Promise<void>(resolve => {
                    chrome.runtime.sendMessage({
                        type: 'UPDATE_UA_RULES',
                        devices: devicesPayload
                    }, () => resolve());
                });
            }

            if (initialState?.devices && editorInstance.getCurrentPageShapes().length === 0) {
                const shapes = initialState.devices.map(device => ({
                    id: `shape:${device.id}`,
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
                        pixelRatio: 1
                    }
                }));

                editorInstance.createShapes(shapes);
                editorInstance.zoomToFit();
            }
        };

        init();

        editorInstance.store.listen((entry: any) => {
            if (entry.changes.updated && entry.changes.updated['instance_page_state:page:page']) {
                const selected = editorInstance.getSelectedShapes();
                const container = selected.find((s: any) => s.type === 'annotation-container');
                if (container) {
                    editorInstance.deselect(container.id);
                }
            }
        });


        editorInstance.store.listen((entry: any) => {
            const selected = editorInstance.getSelectedShapes();
            setHideStylePanel(selected.length === 0);

            if (entry.changes.added) {
                const addedIds: any[] = [];
                Object.keys(entry.changes.added).forEach(id => {
                    const record = entry.changes.added[id as any];
                    if (record.typeName === 'shape') {
                        if (record.type !== 'device' &&
                            record.type !== 'frame' &&
                            record.type !== 'annotation-container') {
                            addedIds.push(record.id);
                        }
                    }
                });

                let parentToUse: string | null = null;

                if (editingDeviceIdRef.current) {
                    const deviceId = editingDeviceIdRef.current;
                    const containerId = `shape:annotation_${deviceId.replace('shape:', '')}`;
                    if (editorInstance.getShape(containerId)) {
                        parentToUse = containerId;
                    }
                }

                if (parentToUse && addedIds.length > 0) {
                    const shapesToReparent = addedIds.filter((id: any) => id !== parentToUse);
                    if (shapesToReparent.length > 0) {
                        editorInstance.reparentShapes(shapesToReparent, parentToUse);
                    }
                }
            }

            if (entry.changes.updated) {
                Object.keys(entry.changes.updated).forEach(id => {
                    const update = entry.changes.updated[id as any];
                    const before = update[0];
                    const after = update[1];

                    if (after.typeName === 'shape' && after.type === 'device') {
                        // @ts-ignore
                        if (before.props.w !== after.props.w || before.props.h !== after.props.h) {
                            const parentId = after.parentId;
                            const parent = editorInstance.getShape(parentId);

                            if (parent && parent.type === 'frame') {
                                editorInstance.updateShape({
                                    id: parentId,
                                    type: 'frame',
                                    // @ts-ignore
                                    props: { w: after.props.w, h: after.props.h }
                                });

                                const siblings = editorInstance.getSortedChildIdsForParent(parentId);
                                siblings.forEach((childId: any) => {
                                    const child = editorInstance.getShape(childId);
                                    if (child && child.type === 'annotation-container') {
                                        editorInstance.updateShape({
                                            id: child.id,
                                            type: 'annotation-container',
                                            // @ts-ignore
                                            props: { w: after.props.w }
                                        });
                                    }
                                });
                            }
                        }
                    }
                });
            }

            const shapes = editorInstance.getCurrentPageShapes();
            const deviceShapes = shapes.filter((s: any) => s.type === 'device');
            const devicesPayload = deviceShapes.map((s: any) => ({
                id: s.id,
                userAgent: s.props.userAgent,
                isolation: true
            }));

            chrome.runtime.sendMessage({
                type: 'UPDATE_UA_RULES',
                devices: devicesPayload
            });
        });
    };

    useEffect(() => {
        if (!editor) return;
        const handleMessage = (msg: any) => {
            if (msg.type === 'REPLAY_SCROLL') {
                const { deviceId, pixelY, docHeight } = msg.payload;
                if (!deviceId) return;
                const annotationId = `shape:annotation_${deviceId.replace('shape:', '')}`;
                const container = editor.getShape(annotationId);
                if (container) {
                    editor.updateShape({
                        id: annotationId,
                        type: 'annotation-container',
                        y: -1 * (pixelY || 0),
                        props: { h: docHeight || container.props.h }
                    });
                }
            } else if (msg.type === 'EVENT_NAVIGATED') {
                const { url } = msg.payload;
                if (url && url !== activeUrl) {
                    setActiveUrl(url);
                    setRecentUrls(prev => {
                        const newUrls = [url, ...prev.filter(u => u !== url)].slice(0, 10);
                        return newUrls;
                    });
                }
            }
        };
        chrome.runtime.onMessage.addListener(handleMessage);
        return () => chrome.runtime.onMessage.removeListener(handleMessage);
    }, [editor, activeUrl]);

    const handleUrlChange = (newUrl: string) => {
        setActiveUrl(newUrl);
        setRecentUrls(prev => {
            const newUrls = [newUrl, ...prev.filter(u => u !== newUrl)].slice(0, 10);
            return newUrls;
        });

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



    const handleRefresh = () => {
        if (editor) {
            editor.getCurrentPageShapes().forEach((shape: any) => {
                if (shape.type === 'device') {
                    const iframe = document.querySelector(`iframe[name*="${shape.id}"]`) as HTMLIFrameElement;
                    if (iframe) {
                        try { iframe.contentWindow?.location.reload(); } catch (e) { iframe.src = iframe.src; }
                    }
                }
            });
        }
    };

    const clearSiteData = async (dataType: 'cache' | 'cookies' | 'storage') => {
        if (!activeUrl) return;
        try {
            await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ type: 'CLEAR_DATA', url: activeUrl, dataType }, (response) => {
                    if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                    else if (response && !response.success) reject(response.error);
                    else resolve(response);
                });
            });
            console.log(`Cleared ${dataType} for ${activeUrl}`);
        } catch (e) { console.error(`Failed to clear ${dataType}`, e); alert(`Failed to clear ${dataType}: ${e}`); }
    };

    const handleClearCache = () => clearSiteData('cache');
    const handleClearCookies = () => clearSiteData('cookies');
    const handleClearStorage = () => clearSiteData('storage');
    const handleOpenSettings = () => { alert('Global Settings not implemented yet. You can configure individual devices via their headers.'); };

    const handleBack = () => { chrome.runtime.sendMessage({ type: 'CMD_NAV_BACK' }); };
    const handleForward = () => { chrome.runtime.sendMessage({ type: 'CMD_NAV_FORWARD' }); };

    const handleExitAnnotationMode = () => {
        setEditingDeviceId(null);
        editingDeviceIdRef.current = null;
        if (editor) {
            editor.selectNone();
            editor.setCurrentTool('select');
        }
    };

    if (!isReady) return <div className="w-screen h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className={`w-screen h-screen absolute inset-0 overflow-hidden ${hideStylePanel ? 'hide-style-panel' : ''} ${editingDeviceId ? 'annotation-mode' : ''}`}>
            <style>{`
                 .tl-frame-heading { display: none !important; }
                 .tl-frame__body { stroke: transparent !important; fill: transparent !important; }
                 /* Z-Index Fixes */
                 .tlui-layout { z-index: 10000 !important; }
                 .tl-ui-layer { z-index: 10000 !important; }
                 /* Hide UI in screenshot mode */
                 body.screenshot-mode .tlui-layout,
                 body.screenshot-mode .tl-ui-layer,
                 body.screenshot-mode .floating-ui-layer, 
                 body.screenshot-mode .vertical-toolbar {
                    display: none !important;
                 }
             `}</style>
            <GlobalControls
                url={activeUrl}
                onUrlChange={handleUrlChange}
                onRefresh={handleRefresh}
                onClearCache={handleClearCache}
                onClearCookies={handleClearCookies}
                onClearStorage={handleClearStorage}
                onOpenSettings={handleOpenSettings}
                onBack={handleBack}
                onForward={handleForward}
                recentUrls={recentUrls}
                annotationModeActive={!!editingDeviceId}
                onExitAnnotationMode={handleExitAnnotationMode}
            />

            <Tldraw
                shapeUtils={shapeUtils}
                tools={customTools}
                components={components}
                onMount={handleMount}
                overrides={uiOverrides}
                persistenceKey="site-device-tldraw"
            />
        </div>
    );
}
