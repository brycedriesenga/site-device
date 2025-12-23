import { useRef, useEffect, useState } from 'react';
import type { Device } from '../types';
import { GripVertical, X, RotateCcw, Copy, Settings, Camera } from 'lucide-react';

interface DeviceFrameProps {
    device: Device;
    url: string;
    isSelected: boolean;
    onMouseDown: (e: React.MouseEvent) => void;
    onFocus?: () => void;
    onDelete: () => void;
    onRotate: () => void;
    onDuplicate: () => void;
    onEdit: () => void;
    onScreenshot: (type?: '1x' | '2x' | 'full-1x' | 'full-2x') => void;
    refreshKey: number; // For forcing reload
    chromeMode?: 'always' | 'hover' | 'never';
}

// Internal helper for the dropdown
const ScreenshotMenu = ({ onScreenshot }: { onScreenshot: (t: '1x' | '2x' | 'full-1x' | 'full-2x') => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <>
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className={`p-1 rounded transition-colors ${isOpen ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-500' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
                title="Screenshot"
            >
                <Camera size={14} />
            </button>
            {isOpen && (
                <div ref={menuRef} className="absolute top-full right-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-lg flex flex-col z-50 overflow-hidden min-w-[80px]">
                    <div className="px-3 py-1 text-[10px] uppercase text-zinc-400 font-semibold bg-zinc-50 dark:bg-zinc-900/50">
                        Viewport
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onScreenshot('1x'); setIsOpen(false); }} className="px-3 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 text-left text-zinc-700 dark:text-zinc-200">
                        1x
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onScreenshot('2x'); setIsOpen(false); }} className="px-3 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 text-left text-zinc-700 dark:text-zinc-200">
                        2x
                    </button>
                    <div className="border-t border-zinc-100 dark:border-zinc-700 my-0.5"></div>
                    <div className="px-3 py-1 text-[10px] uppercase text-zinc-400 font-semibold bg-zinc-50 dark:bg-zinc-900/50">
                        Full Page
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onScreenshot('full-1x'); setIsOpen(false); }} className="px-3 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 text-left text-zinc-700 dark:text-zinc-200">
                        Full Page
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onScreenshot('full-2x'); setIsOpen(false); }} className="px-3 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 text-left text-zinc-700 dark:text-zinc-200">
                        Full Page (2x)
                    </button>
                </div>
            )}
        </>
    );
};

export const DeviceFrame: React.FC<DeviceFrameProps> = ({
    device, url, isSelected, onMouseDown, onFocus, onDelete, onRotate, onDuplicate, onEdit, onScreenshot, refreshKey, chromeMode = 'always'
}) => {
    const frameRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [iframeKey, setIframeKey] = useState(0);

    const getUrlWithId = (base: string, id: string) => {
        try {
            const u = new URL(base);
            u.searchParams.set('deviceId', id);
            return u.toString();
        } catch {
            return base;
        }
    };

    // Force iframe reload when refreshKey changes or device type changes
    useEffect(() => {
        setIframeKey(k => k + 1);
    }, [device.type, refreshKey]);

    // Handle iframe focus (click anywhere on site)
    useEffect(() => {
        const handleBlur = () => {
            if (document.activeElement === iframeRef.current) {
                onFocus?.();
            }
        };
        window.addEventListener('blur', handleBlur);
        return () => window.removeEventListener('blur', handleBlur);
    }, [onFocus]);

    return (
        <div
            ref={frameRef}
            className={`absolute bg-white dark:bg-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col transition-shadow group
                ${isSelected ? 'ring-2 ring-blue-500 shadow-blue-500/20' : 'hover:shadow-xl'}
            `}
            style={{
                width: device.width,
                height: device.height + (chromeMode === 'always' ? 40 : 0), // Header height conditional
                left: device.x,
                top: device.y,
                zIndex: device.zIndex, // Use zIndex prop
            }}
            onMouseDown={onMouseDown}
        >
            {/* Header */}
            {chromeMode !== 'never' && (
                <div className={`
                    device-header unselectable h-10 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing shrink-0
                    ${chromeMode === 'hover' ? 'absolute top-0 left-0 right-0 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-sm bg-zinc-100/90 dark:bg-zinc-900/90' : ''}
                `}>
                    <div className="flex items-center gap-2">
                        <GripVertical size={14} className="text-zinc-400" />
                        <span className="font-medium text-xs text-zinc-600 dark:text-zinc-300 truncate max-w-[120px]" title={device.name}>
                            {device.name}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                            {device.width}x{device.height}
                        </span>
                    </div>

                    <div className="flex gap-1 opacity-100 items-center">
                        <div className="relative">
                            <ScreenshotMenu onScreenshot={onScreenshot} />
                        </div>

                        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors" title="Settings">
                            <Settings size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors" title="Duplicate">
                            <Copy size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onRotate(); }} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors" title="Rotate">
                            <RotateCcw size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-red-400 hover:text-red-500 transition-colors" title="Remove">
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 relative bg-white isolate">
                {url ? (
                    <iframe
                        ref={iframeRef}
                        key={iframeKey}
                        src={getUrlWithId(url, device.id)}
                        className="w-full h-full border-none touch-auto"
                        title={device.name}
                        {...(device.isolation !== false ? {
                            sandbox: "allow-forms allow-scripts allow-popups allow-presentation allow-top-navigation-by-user-activation allow-modals allow-same-origin allow-orientation-lock"
                        } : {})}
                        name={`SD_CONF:${JSON.stringify({
                            id: device.id,
                            ua: device.userAgent,
                            ch: device.clientHints,
                            type: device.type,
                            w: device.width,
                            h: device.height
                        })}`}
                        data-device-id={device.id}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm">
                        No URL loaded
                    </div>
                )}

                {/* Interaction Overlay (for drag functionality) */}
                <div className="absolute inset-0 z-10 pointer-events-none" />
            </div>
        </div>
    );
};
