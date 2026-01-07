import React, { useState } from 'react';
import { Monitor, Smartphone, Tablet, Plus, ChevronUp } from 'lucide-react';
import { createPortal } from 'react-dom';

interface BottomControlsProps {
    onAddDevice: (type: 'mobile' | 'tablet' | 'desktop') => void;
}

export const BottomControls: React.FC<BottomControlsProps> = ({ onAddDevice }) => {
    const [menuOpen, setMenuOpen] = useState(false);

    const toggleMenu = () => setMenuOpen(!menuOpen);

    const handleAdd = (type: 'mobile' | 'tablet' | 'desktop') => {
        onAddDevice(type);
        setMenuOpen(false);
    };

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[3000] flex flex-col items-center pointer-events-none">

            {/* Popover Menu */}
            {menuOpen && (
                <div className="mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden flex flex-col min-w-[140px] pointer-events-auto animate-in slide-in-from-bottom-2 fade-in duration-200">
                    <button onClick={() => handleAdd('mobile')} className="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-200 text-left transition-colors">
                        <Smartphone size={16} /> Mobile
                    </button>
                    <button onClick={() => handleAdd('tablet')} className="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-200 text-left transition-colors">
                        <Tablet size={16} /> Tablet
                    </button>
                    <button onClick={() => handleAdd('desktop')} className="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-200 text-left transition-colors">
                        <Monitor size={16} /> Desktop
                    </button>
                </div>
            )}

            {/* Main Toggle Button */}
            <button
                onClick={toggleMenu}
                className={`pointer-events-auto flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-lg px-4 py-2.5 rounded-full text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all ${menuOpen ? 'ring-2 ring-blue-500' : ''}`}
            >
                <Plus size={18} />
                <span>Add Device</span>
                <ChevronUp size={16} className={`text-zinc-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Backdrop for closing */}
            {menuOpen && createPortal(
                <div className="fixed inset-0 z-[290] bg-transparent" onClick={() => setMenuOpen(false)} />,
                document.body
            )}
        </div>
    );
};
