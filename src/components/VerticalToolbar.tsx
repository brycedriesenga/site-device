import { useTools, useIsToolSelected, useEditor, useValue } from 'tldraw';
import { Smartphone, Tablet, Monitor } from 'lucide-react';

export function VerticalToolbar() {
    const editor = useEditor();
    const tools = useTools();

    // Track selections
    const isMobileSelected = useIsToolSelected(tools['tool-mobile']);
    const isTabletSelected = useIsToolSelected(tools['tool-tablet']);
    const isDesktopSelected = useIsToolSelected(tools['tool-desktop']);

    // Check for Annotation Mode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isAnnotationMode = useValue('isAnnotationMode', () => (editor as any).getInstanceState().isAnnotationMode, [editor]);

    if (isAnnotationMode) return null;

    const handleSelectTool = (id: string) => {
        editor.setCurrentTool(id);
    };

    return (
        <div className="vertical-toolbar fixed left-4 top-1/2 -translate-y-1/2 z-[20000] flex flex-col gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-2 rounded-xl shadow-lg pointer-events-auto">

            {/* Device Tools */}
            <button
                onClick={() => handleSelectTool('tool-mobile')}
                className={`p-3 rounded-lg transition-colors flex items-center justify-center ${isMobileSelected
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400'
                    }`}
                title="Add Mobile"
            >
                <Smartphone size={20} />
            </button>

            <button
                onClick={() => handleSelectTool('tool-tablet')}
                className={`p-3 rounded-lg transition-colors flex items-center justify-center ${isTabletSelected
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400'
                    }`}
                title="Add Tablet"
            >
                <Tablet size={20} />
            </button>

            <button
                onClick={() => handleSelectTool('tool-desktop')}
                className={`p-3 rounded-lg transition-colors flex items-center justify-center ${isDesktopSelected
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400'
                    }`}
                title="Add Desktop"
            >
                <Monitor size={20} />
            </button>
        </div>
    );
}
