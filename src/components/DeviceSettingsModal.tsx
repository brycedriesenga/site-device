import React, { useState } from 'react';
import type { Device } from '../types';
import { X, Save } from 'lucide-react';

interface DeviceSettingsModalProps {
    device: Device;
    url: string;
    onSave: (updatedDevice: Device) => void;
    onClose: () => void;
}

export const DeviceSettingsModal: React.FC<DeviceSettingsModalProps> = ({ device, url, onSave, onClose }) => {
    const [name, setName] = useState(device.name);
    const [width, setWidth] = useState(device.width);
    const [height, setHeight] = useState(device.height);
    const [ua, setUa] = useState(device.userAgent);
    const [isolation, setIsolation] = useState(device.isolation || false);

    // Client Hints state
    const [platform, setPlatform] = useState(device.clientHints?.platform || '');
    const [isMobile, setIsMobile] = useState(device.clientHints?.mobile || false);
    const [brand, setBrand] = useState(device.clientHints?.brands?.[0]?.brand || 'Google Chrome');

    const handleSave = () => {
        onSave({
            ...device,
            name,
            width: Number(width),
            height: Number(height),
            userAgent: ua,
            isolation,
            clientHints: {
                platform,
                mobile: isMobile,
                brands: [{ brand, version: '110' }, { brand: 'Chromium', version: '110' }]
            }
        });
    };

    const handleClearSiteData = () => {
        if (!url) {
            alert("No URL is currently loaded.");
            return;
        }
        try {
            const origin = new URL(url).origin;
            if (chrome.browsingData) {
                chrome.browsingData.remove({
                    origins: [origin]
                }, {
                    cacheStorage: true,
                    cookies: true,
                    fileSystems: true,
                    indexedDB: true,
                    localStorage: true,
                    serviceWorkers: true,
                }, () => {
                    alert(`Cleared data for ${origin}`);
                });
            } else {
                alert("BrowsingData API not available.");
            }
        } catch (e) {
            alert("Invalid URL.");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-lg font-bold">Device Settings</h2>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Device Name</label>
                        <input
                            className="w-full p-2 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                            value={name} onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Width (px)</label>
                            <input
                                type="number"
                                className="w-full p-2 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                                value={width} onChange={e => setWidth(Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Height (px)</label>
                            <input
                                type="number"
                                className="w-full p-2 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                                value={height} onChange={e => setHeight(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">User Agent & Emulation</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">User Agent String</label>
                                <textarea
                                    className="w-full p-2 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 text-xs font-mono h-20 text-zinc-900 dark:text-zinc-100"
                                    value={ua} onChange={e => setUa(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Platform (OS)</label>
                                    <input
                                        placeholder="e.g. macOS, Windows, Android"
                                        className="w-full p-2 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
                                        value={platform} onChange={e => setPlatform(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Brand</label>
                                    <input
                                        placeholder="e.g. Chrome"
                                        className="w-full p-2 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
                                        value={brand} onChange={e => setBrand(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isMobile"
                                    checked={isMobile}
                                    onChange={e => setIsMobile(e.target.checked)}
                                    className="w-4 h-4 rounded border-zinc-300"
                                />
                                <label htmlFor="isMobile" className="text-sm">Emulate Mobile Device (Client Hint)</label>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
                        <h3 className="font-semibold mb-3">Storage & Cookies</h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                <input
                                    type="checkbox"
                                    id="isolation"
                                    checked={isolation}
                                    onChange={e => setIsolation(e.target.checked)}
                                    className="mt-1 w-4 h-4 rounded border-zinc-300"
                                />
                                <div>
                                    <label htmlFor="isolation" className="block text-sm font-medium">Isolation Mode</label>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Prevents this device from accessing shared cookies and storage.
                                        Useful for viewing sites as a "fresh" visitor without conflicts.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleClearSiteData}
                                className="w-full py-2 px-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded border border-red-200 dark:border-red-900/50"
                            >
                                Clear Site Data for {url ? new URL(url).hostname : 'current site'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                    >
                        <Save size={16} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};
