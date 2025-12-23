import React from 'react';
import { X, Settings, Shield, Smartphone, LayoutTemplate } from 'lucide-react';

interface GlobalSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Bulk Actions
    onToggleAllIsolation: (enabled: boolean) => void;
    onToggleAllMobileHints: (enabled: boolean) => void;
    // Global Toggles
    deviceChromeMode: 'always' | 'hover' | 'never';
    onSetDeviceChromeMode: (mode: 'always' | 'hover' | 'never') => void;
}

export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({
    isOpen,
    onClose,
    onToggleAllIsolation,
    onToggleAllMobileHints,
    deviceChromeMode,
    onSetDeviceChromeMode
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md border border-zinc-200 dark:border-zinc-800 flex flex-col scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                        <Settings size={20} className="text-blue-500" />
                        Global Settings
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500 dark:text-zinc-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Bulk Isolation */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                            <Shield size={16} />
                            Bulk Actions
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => onToggleAllIsolation(true)}
                                className="px-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 transition-colors"
                            >
                                Enable Isolation (All)
                            </button>
                            <button
                                onClick={() => onToggleAllIsolation(false)}
                                className="px-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 transition-colors"
                            >
                                Disable Isolation (All)
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500">
                            Applies Cookie/Storage isolation to all currently active devices.
                        </p>
                    </div>

                    {/* Bulk Mobile Hints */}
                    <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        <h3 className="text-sm font-semibold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                            <Smartphone size={16} />
                            Mobile Emulation
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => onToggleAllMobileHints(true)}
                                className="px-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 transition-colors"
                            >
                                Enable Mobile Hints
                            </button>
                            <button
                                onClick={() => onToggleAllMobileHints(false)}
                                className="px-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 transition-colors"
                            >
                                Disable Mobile Hints
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500">
                            Enables/Disables 'Sec-CH-UA-Mobile' headers for all Mobile/Tablet devices.
                        </p>
                    </div>

                    {/* Global Visual Toggles */}
                    <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        <h3 className="text-sm font-semibold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                            <LayoutTemplate size={16} />
                            Device Headers (Chrome)
                        </h3>
                        <div className="grid grid-cols-3 gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                            <button
                                onClick={() => onSetDeviceChromeMode('always')}
                                className={`px-3 py-2 text-xs font-medium rounded-md transition-all ${deviceChromeMode === 'always'
                                        ? 'bg-white dark:bg-zinc-700 text-blue-600 shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                                    }`}
                            >
                                Always Show
                            </button>
                            <button
                                onClick={() => onSetDeviceChromeMode('hover')}
                                className={`px-3 py-2 text-xs font-medium rounded-md transition-all ${deviceChromeMode === 'hover'
                                        ? 'bg-white dark:bg-zinc-700 text-blue-600 shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                                    }`}
                            >
                                Show on Hover
                            </button>
                            <button
                                onClick={() => onSetDeviceChromeMode('never')}
                                className={`px-3 py-2 text-xs font-medium rounded-md transition-all ${deviceChromeMode === 'never'
                                        ? 'bg-white dark:bg-zinc-700 text-blue-600 shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                                    }`}
                            >
                                Never Show
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500">
                            "Show on Hover" overlays the header when you mouse over a device.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
