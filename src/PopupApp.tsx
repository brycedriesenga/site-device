import React from 'react';
import { Monitor } from 'lucide-react';

export const PopupApp: React.FC = () => {
    const openDashboard = () => {
        chrome.tabs.create({ url: 'index.html' });
    };

    return (
        <div className="w-full min-h-screen p-6 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-2">
                <Monitor className="text-blue-500" size={24} />
                <h1 className="font-bold text-lg">SiteDevice</h1>
            </div>
            <p className="text-sm text-center text-zinc-500 dark:text-zinc-400">
                View websites on multiple devices simultaneously.
            </p>
            <button
                onClick={openDashboard}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
                Open Workspace
            </button>
        </div>
    );
};
