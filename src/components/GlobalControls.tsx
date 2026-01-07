import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Database, Cookie, Zap, ArrowLeft, ArrowRight } from 'lucide-react';

interface GlobalControlsProps {
    url: string;
    onUrlChange: (url: string) => void;
    // Removed onAddDevice
    onRefresh: () => void;
    onClearCache: () => void;
    onClearCookies: () => void;
    onClearStorage: () => void;
    onOpenSettings: () => void;
    onBack: () => void;
    onForward: () => void;
    recentUrls?: string[];
    // New prop for banner support
    annotationModeActive?: boolean;
    onExitAnnotationMode?: () => void;
}

export const GlobalControls: React.FC<GlobalControlsProps> = ({
    url,
    onUrlChange,
    onRefresh,
    onClearCache,
    onClearCookies,
    onClearStorage,
    onBack,
    onForward,
    recentUrls = [],
    annotationModeActive,
    onExitAnnotationMode
}) => {
    const [inputUrl, setInputUrl] = useState(url);

    useEffect(() => {
        setInputUrl(url);
    }, [url]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let finalUrl = inputUrl;
        if (finalUrl && !finalUrl.startsWith('http') && !finalUrl.startsWith('file')) {
            finalUrl = 'https://' + finalUrl;
        }
        onUrlChange(finalUrl);
    };

    return (
        <div className="global-controls absolute top-4 left-1/2 -translate-x-1/2 z-[3000] flex flex-col gap-2 items-center pointer-events-none">
            {/* Main Bar */}
            <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl p-2 flex items-center gap-2 pointer-events-auto transition-opacity ${annotationModeActive ? 'opacity-50 hover:opacity-100' : 'opacity-100'}`}>

                {/* ID: Navigation Controls */}
                <div className="flex items-center gap-0.5">
                    <button type="button" onClick={onBack} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 disabled:opacity-30" title="Go Back">
                        <ArrowLeft size={18} />
                    </button>
                    <button type="button" onClick={onForward} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 disabled:opacity-30" title="Go Forward">
                        <ArrowRight size={18} />
                    </button>
                    <button onClick={onRefresh} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400" title="Refresh All">
                        <RefreshCw size={18} />
                    </button>
                </div>

                <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 mx-1"></div>

                {/* URL Input */}
                <form onSubmit={handleSubmit} className="flex relative items-center">
                    <Search className="absolute left-3 text-zinc-400" size={16} />
                    <div className="absolute right-2 flex items-center gap-1">
                        <button type="button" onClick={onClearCache} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md text-zinc-500 hover:text-amber-600 transition-colors" title="Clear Cache (Current URL)">
                            <Zap size={14} />
                        </button>
                        <button type="button" onClick={onClearCookies} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md text-zinc-500 hover:text-amber-600 transition-colors" title="Clear Cookies (Current URL)">
                            <Cookie size={14} />
                        </button>
                        <button type="button" onClick={onClearStorage} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md text-zinc-500 hover:text-red-500 transition-colors" title="Clear Storage (Current URL)">
                            <Database size={14} />
                        </button>
                    </div>
                    <input
                        type="text"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        placeholder="https://example.com"
                        list="recent-urls"
                        className="pl-9 pr-28 h-9 w-80 md:w-[450px] bg-zinc-100 dark:bg-zinc-800 rounded-lg border-none outline-none focus:ring-2 ring-blue-500 text-base text-zinc-900 dark:text-zinc-100 transition-all"
                    />
                    <datalist id="recent-urls">
                        {recentUrls?.map((u, i) => (
                            <option key={i} value={u} />
                        ))}
                    </datalist>
                </form>
            </div>

            {/* Annotation Mode Banner - Just Below Global Controls */}
            {annotationModeActive && (
                <div className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3 pointer-events-auto animate-in fade-in slide-in-from-top-2">
                    <span className="text-sm font-medium">Annotation Mode Active</span>
                    <button
                        onClick={onExitAnnotationMode}
                        className="bg-white text-blue-600 px-2 py-0.5 rounded text-xs font-bold hover:bg-blue-50"
                    >
                        Exit
                    </button>
                </div>
            )}
        </div>
    );
};
