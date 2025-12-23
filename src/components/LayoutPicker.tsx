import React, { useState, useRef, useEffect } from 'react';
import { LayoutGrid, ArrowRight, ArrowDown, Grid } from 'lucide-react';

interface LayoutPickerProps {
    onArrange: (type: 'horizontal' | 'vertical' | 'grid') => void;
}

export const LayoutPicker: React.FC<LayoutPickerProps> = ({ onArrange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (type: 'horizontal' | 'vertical' | 'grid') => {
        onArrange(type);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg ${isOpen ? 'bg-zinc-100 dark:bg-zinc-800' : ''}`}
                title="Layout & Arrangement"
            >
                <LayoutGrid size={20} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl py-2 z-50">
                    <div className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase">Auto-Arrange</div>

                    <button onClick={() => handleSelect('horizontal')} className="w-full text-left px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2">
                        <ArrowRight size={16} className="text-zinc-500" />
                        <span className="text-sm">Horizontal Row</span>
                    </button>

                    <button onClick={() => handleSelect('vertical')} className="w-full text-left px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2">
                        <ArrowDown size={16} className="text-zinc-500" />
                        <span className="text-sm">Vertical Column</span>
                    </button>

                    <button onClick={() => handleSelect('grid')} className="w-full text-left px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2">
                        <Grid size={16} className="text-zinc-500" />
                        <span className="text-sm">Grid / Masonry</span>
                    </button>


                </div>
            )}
        </div>
    );
};
