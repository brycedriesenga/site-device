interface ToolbarProps {
    url: string;
    onUrlChange: (url: string) => void;
    recentUrls?: string[];
    scale: number;
    onZoomChange: (scale: number) => void; // Replaces onZoomIn/Out for more control
    onAddDevice: (type: 'mobile' | 'tablet' | 'desktop') => void;
    isDarkMode: boolean;
    onToggleDarkMode: () => void;
    onClearData: () => void;
    onScreenshot: (type: '1x' | '2x') => void;

    // Background Props
    bgColor: string;
    pattern: 'none' | 'dots' | 'grid';
    patternColor: string;
    onBackgroundChange: (updates: { bgColor?: string; pattern?: 'none' | 'dots' | 'grid'; patternColor?: string }) => void;

    onArrange: (type: 'horizontal' | 'vertical' | 'grid') => void;
    onFitToView: () => void;
    onRefresh: () => void;
    isAnnotationMode: boolean;
    onToggleAnnotationMode: () => void;
    areAnnotationsVisible: boolean;
    onToggleAnnotationsVisibility: () => void;
    onOpenGlobalSettings: () => void;
}

import { Search, Plus, Minus, Monitor, Smartphone, Tablet, Moon, Sun, Trash2, Camera, Maximize, RefreshCw, Pencil, Eye, EyeOff, Settings } from 'lucide-react';
import React, { useState } from 'react';
import { BackgroundPicker } from './BackgroundPicker';
import { LayoutPicker } from './LayoutPicker';

export const Toolbar: React.FC<ToolbarProps> = ({
    url, onUrlChange, recentUrls = [], scale, onZoomChange, onAddDevice,
    isDarkMode, onToggleDarkMode, onClearData, onScreenshot,
    bgColor, pattern, patternColor, onBackgroundChange,
    onArrange, onFitToView, onRefresh,
    isAnnotationMode, onToggleAnnotationMode,
    areAnnotationsVisible, onToggleAnnotationsVisibility, onOpenGlobalSettings
}) => {
    const [inputUrl, setInputUrl] = useState(url);
    const [zoomInput, setZoomInput] = useState(Math.round(scale * 100).toString());

    // Sync input when props change
    React.useEffect(() => setInputUrl(url), [url]);
    React.useEffect(() => setZoomInput(Math.round(scale * 100).toString()), [scale]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let finalUrl = inputUrl;
        if (!finalUrl.startsWith('http') && !finalUrl.startsWith('file')) {
            finalUrl = 'https://' + finalUrl;
        }
        onUrlChange(finalUrl);
    };

    const handleZoomSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        let val = parseInt(zoomInput, 10);
        if (isNaN(val)) val = 100;
        val = Math.max(10, Math.min(val, 500)); // Clamp 10% - 500%
        onZoomChange(val / 100);
    };

    const [isScreenshotOpen, setIsScreenshotOpen] = useState(false);
    const screenshotRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (screenshotRef.current && !screenshotRef.current.contains(event.target as Node)) {
                setIsScreenshotOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 flex items-center px-4 justify-between z-50 relative shrink-0">
            <div className="flex items-center gap-4 shrink-0">
                <h1 className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-500 hidden md:block">SiteDevice</h1>

                <form onSubmit={handleSubmit} className="flex relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input
                        type="text"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        list="recent-urls"
                        placeholder="https://example.com"
                        className="pl-9 pr-4 py-2 w-48 md:w-80 bg-zinc-100 dark:bg-zinc-800 rounded-lg border-none outline-none focus:ring-2 ring-blue-500 text-sm transition-all"
                    />
                    <datalist id="recent-urls">
                        {recentUrls.map((u, i) => (
                            <option key={i} value={u} />
                        ))}
                    </datalist>
                </form>

                <button onClick={onRefresh} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" title="Refresh All Devices">
                    <RefreshCw size={20} />
                </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => onZoomChange(Math.max(0.1, scale - 0.1))} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                    <Minus size={20} />
                </button>

                <form onSubmit={handleZoomSubmit} className="w-12">
                    <input
                        type="text"
                        value={zoomInput}
                        onChange={(e) => setZoomInput(e.target.value)}
                        onBlur={() => handleZoomSubmit()}
                        className="w-full text-center bg-transparent text-sm font-medium outline-none border-b border-transparent focus:border-blue-500 transition-colors"
                    />
                </form>
                <span className="text-zinc-400 text-xs select-none">%</span>

                <button onClick={() => onZoomChange(scale + 0.1)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                    <Plus size={20} />
                </button>

                <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 mx-1"></div>

                <button onClick={onFitToView} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-blue-600 dark:text-blue-400" title="Fit to View">
                    <Maximize size={20} />
                </button>
            </div>

            <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-1 border-l border-zinc-200 dark:border-zinc-700 pl-4 hidden sm:flex">
                    <button onClick={() => onAddDevice('mobile')} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" title="Add Mobile">
                        <Smartphone size={20} />
                    </button>
                    <button onClick={() => onAddDevice('tablet')} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" title="Add Tablet">
                        <Tablet size={20} />
                    </button>
                    <button onClick={() => onAddDevice('desktop')} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" title="Add Desktop">
                        <Monitor size={20} />
                    </button>
                </div>

                <div className="flex items-center gap-1 border-l border-zinc-200 dark:border-zinc-700 pl-4">
                    <LayoutPicker onArrange={onArrange} />
                    <BackgroundPicker
                        bgColor={bgColor}
                        pattern={pattern}
                        patternColor={patternColor}
                        onChange={onBackgroundChange}
                    />

                    <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 ml-2">
                        <button
                            onClick={onToggleAnnotationsVisibility}
                            className={`p-1.5 rounded-md transition-colors ${!areAnnotationsVisible ? 'text-zinc-600 dark:text-zinc-400 bg-zinc-200 dark:bg-zinc-700' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                            title={areAnnotationsVisible ? "Hide Annotations" : "Show Annotations"}
                        >
                            {areAnnotationsVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                        <button
                            onClick={onToggleAnnotationMode}
                            className={`p-1.5 rounded-md transition-colors ${isAnnotationMode ? 'bg-white dark:bg-zinc-600 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                            title="Annotation Mode (Freezes Devices)"
                        >
                            <Pencil size={18} />
                        </button>
                    </div>

                    <div className="relative" ref={screenshotRef}>
                        <button onClick={() => setIsScreenshotOpen(!isScreenshotOpen)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" title="Screenshot All">
                            <Camera size={20} />
                        </button>
                        {isScreenshotOpen && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl py-2 z-50">
                                <div className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase">Capture All Views</div>
                                <button onClick={() => { onScreenshot('1x'); setIsScreenshotOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm">
                                    Capture 1x Resolution
                                </button>
                                <button onClick={() => { onScreenshot('2x'); setIsScreenshotOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm">
                                    Capture 2x Resolution
                                </button>
                            </div>
                        )}
                    </div>

                    <button onClick={onClearData} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-red-500" title="Clear Cookies & Storage for Current Site">
                        <Trash2 size={20} />
                    </button>
                    <button onClick={onToggleDarkMode} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" title="Toggle Dark Mode">
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 mx-1"></div>
                    <button onClick={onOpenGlobalSettings} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400" title="Global Settings">
                        <Settings size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
