import React, { useState, useRef, useEffect } from 'react';
import { Palette } from 'lucide-react';

interface BackgroundPickerProps {
    bgColor: string;
    pattern: 'none' | 'dots' | 'grid';
    patternColor: string;
    onChange: (updates: { bgColor?: string; pattern?: 'none' | 'dots' | 'grid'; patternColor?: string }) => void;
}

export const BackgroundPicker: React.FC<BackgroundPickerProps> = ({ bgColor, pattern, patternColor, onChange }) => {
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

    const presets = [
        { name: 'Zinc', bg: '#fafafa', p: 'none', pc: '#e4e4e7' },
        { name: 'Dots', bg: '#fafafa', p: 'dots', pc: '#e4e4e7' },
        { name: 'Grid', bg: '#fafafa', p: 'grid', pc: '#e4e4e7' },
        { name: 'Dark', bg: '#09090b', p: 'dots', pc: '#27272a' },
        { name: 'Blue', bg: '#eff6ff', p: 'grid', pc: '#dbeafe' },
    ] as const;

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg ${isOpen ? 'bg-zinc-100 dark:bg-zinc-800' : ''}`}
                title="Customize Background"
            >
                <Palette size={20} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl p-4 z-50 flex flex-col gap-4">

                    {/* Presets */}
                    <div>
                        <div className="text-xs font-medium text-zinc-500 uppercase mb-2">Presets</div>
                        <div className="flex gap-2 flex-wrap">
                            {presets.map((preset, i) => (
                                <button
                                    key={i}
                                    onClick={() => onChange({ bgColor: preset.bg, pattern: preset.p as any, patternColor: preset.pc })}
                                    className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-sm"
                                    style={{ backgroundColor: preset.bg }}
                                    title={preset.name}
                                />
                            ))}
                        </div>
                    </div>

                    <hr className="border-zinc-200 dark:border-zinc-700" />

                    {/* Background Color */}
                    <div>
                        <div className="text-xs font-medium text-zinc-500 uppercase mb-2">Background Color</div>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={bgColor}
                                onChange={(e) => onChange({ bgColor: e.target.value })}
                                className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                            />
                            <span className="text-xs font-mono text-zinc-500">{bgColor}</span>
                        </div>
                    </div>

                    {/* Pattern */}
                    <div>
                        <div className="text-xs font-medium text-zinc-500 uppercase mb-2">Pattern</div>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                            {(['none', 'dots', 'grid'] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => onChange({ pattern: p })}
                                    className={`text-xs py-1 px-2 rounded border ${pattern === p ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' : 'bg-transparent border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                                >
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                        </div>

                        {pattern !== 'none' && (
                            <div className="flex items-center gap-2 mt-2">
                                <label className="text-xs text-zinc-500">Color:</label>
                                <input
                                    type="color"
                                    value={patternColor}
                                    onChange={(e) => onChange({ patternColor: e.target.value })}
                                    className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                                />
                                <span className="text-xs font-mono text-zinc-500">{patternColor}</span>
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
};
