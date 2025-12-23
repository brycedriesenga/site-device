import React, { useState, useEffect } from 'react';
import { Search, Monitor, Smartphone, Tablet, RefreshCw, Database, Cookie, Zap } from 'lucide-react';

interface GlobalControlsProps {
    url: string;
    onUrlChange: (url: string) => void;
    onAddDevice: (type: 'mobile' | 'tablet' | 'desktop') => void;
    onRefresh: () => void;
    onClearCache: () => void;
    onClearCookies: () => void;
    onClearStorage: () => void;
    onOpenSettings: () => void;
}

export const GlobalControls: React.FC<GlobalControlsProps> = ({
    url,
    onUrlChange,
    onAddDevice,
    onRefresh,
    onClearCache,
    onClearCookies,
    onClearStorage,
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
        <div className="global-controls absolute top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center pointer-events-none">
            {/* Main Bar */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl p-2 flex items-center gap-2 pointer-events-auto">
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
                        className="pl-9 pr-28 py-2 w-80 md:w-[450px] bg-zinc-100 dark:bg-zinc-800 rounded-lg border-none outline-none focus:ring-2 ring-blue-500 text-base text-zinc-900 dark:text-zinc-100 transition-all"
                    />
                </form>

                <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 mx-1"></div>

                {/* Actions */}
                <button onClick={onRefresh} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400" title="Refresh All">
                    <RefreshCw size={18} />
                </button>


            </div>

            {/* Sub Bar (Devices & Tools) */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg p-1.5 flex items-center gap-1 pointer-events-auto scale-90 opacity-80 hover:opacity-100 hover:scale-100 transition-all">
                <button onClick={() => onAddDevice('mobile')} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg flex gap-2 items-center text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    <Smartphone size={16} /> Mobile
                </button>
                <button onClick={() => onAddDevice('tablet')} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg flex gap-2 items-center text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    <Tablet size={16} /> Tablet
                </button>
                <button onClick={() => onAddDevice('desktop')} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg flex gap-2 items-center text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    <Monitor size={16} /> Desktop
                </button>


            </div>
        </div>
    );
};
