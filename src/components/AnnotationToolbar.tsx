import React from 'react';
import { MousePointer2, Pen, Square, Circle, MoveRight, Type, Eraser, Trash2, X } from 'lucide-react';
import type { AnnotationTool } from '../types';

interface AnnotationToolbarProps {
    activeTool: AnnotationTool;
    onToolChange: (tool: AnnotationTool) => void;
    activeColor: string;
    onColorChange: (color: string) => void;
    onClear: () => void;
    onClose: () => void;
}

const COLORS = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#3b82f6', // Blue
    '#a855f7', // Purple
    '#000000', // Black
    '#ffffff', // White
];

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
    activeTool, onToolChange, activeColor, onColorChange, onClear, onClose
}) => {
    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-800 rounded-full shadow-xl border border-zinc-200 dark:border-zinc-700 p-2 flex items-center gap-2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
            {/* Tools */}
            <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-full p-1 gap-1">
                <ToolButton
                    active={activeTool === 'select'}
                    onClick={() => onToolChange('select')}
                    title="Select / Move"
                >
                    <MousePointer2 size={18} />
                </ToolButton>
                <ToolButton
                    active={activeTool === 'pen'}
                    onClick={() => onToolChange('pen')}
                    title="Draw"
                >
                    <Pen size={18} />
                </ToolButton>
                <ToolButton
                    active={activeTool === 'rect'}
                    onClick={() => onToolChange('rect')}
                    title="Rectangle"
                >
                    <Square size={18} />
                </ToolButton>
                <ToolButton
                    active={activeTool === 'circle'}
                    onClick={() => onToolChange('circle')}
                    title="Circle"
                >
                    <Circle size={18} />
                </ToolButton>
                <ToolButton
                    active={activeTool === 'arrow'}
                    onClick={() => onToolChange('arrow')}
                    title="Arrow"
                >
                    <MoveRight size={18} />
                </ToolButton>
                <ToolButton
                    active={activeTool === 'text'}
                    onClick={() => onToolChange('text')}
                    title="Text"
                >
                    <Type size={18} />
                </ToolButton>
                <ToolButton
                    active={activeTool === 'eraser'}
                    onClick={() => onToolChange('eraser')}
                    title="Eraser"
                >
                    <Eraser size={18} />
                </ToolButton>
            </div>

            <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1" />

            {/* Colors */}
            <div className="flex gap-1.5 px-1">
                {COLORS.map(color => (
                    <button
                        key={color}
                        onClick={() => onColorChange(color)}
                        className={`w-5 h-5 rounded-full border border-zinc-200 dark:border-zinc-700 transition-transform ${activeColor === color ? 'scale-125 ring-2 ring-primary offset-1' : 'hover:scale-110'}`}
                        style={{ backgroundColor: color }}
                        title={color}
                    />
                ))}
            </div>

            <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1" />

            {/* Actions */}
            <button
                onClick={onClear}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                title="Clear All"
            >
                <Trash2 size={18} />
            </button>
            <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full transition-colors"
                title="Close"
            >
                <X size={18} />
            </button>
        </div>
    );
};

const ToolButton = ({ active, onClick, children, title }: { active: boolean, onClick: () => void, children: React.ReactNode, title: string }) => (
    <button
        onClick={onClick}
        title={title}
        className={`p-2 rounded-full transition-all ${active
            ? 'bg-white dark:bg-zinc-700 shadow text-blue-500'
            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800'
            }`}
    >
        {children}
    </button>
);
