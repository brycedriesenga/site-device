import type { StorageState } from '../types';

const STORAGE_KEY = 'site-device-state';

export const defaultState: StorageState = {
    devices: [], // Will be filled with defaults if empty
    canvas: {
        scale: 1,
        x: 0,
        y: 0,
        bgColor: '#fafafa',
        pattern: 'dots',
        patternColor: '#e4e4e7'
    },
    url: '',
    recentUrls: [],
    theme: 'light'
};

/**
 * @deprecated Use ChromeStorageAdapter for new code - this will be removed in a future version
 */
export const saveState = async (state: Partial<StorageState>) => {
    console.warn('[Storage] saveState is deprecated, use ChromeStorageAdapter instead');
    try {
        const current = await loadState();
        const newState = { ...current, ...state };
        await chrome.storage.local.set({ [STORAGE_KEY]: newState });
    } catch (e) {
        console.error('Failed to save state:', e);
    }
};

/**
 * @deprecated Use ChromeStorageAdapter for new code - this will be removed in a future version
 */
export const loadState = async (): Promise<StorageState> => {
    try {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        return (result[STORAGE_KEY] as StorageState) || defaultState;
    } catch (e) {
        console.error('Failed to load state:', e);
        return defaultState;
    }
};

/**
 * @deprecated Use ChromeStorageAdapter for new code - this will be removed in a future version
 */
export const addRecentUrl = async (url: string) => {
    if (!url) return;
    try {
        const state = await loadState();
        const recents = state.recentUrls || [];
        const newRecents = [url, ...recents.filter(u => u !== url)].slice(0, 10);
        await saveState({ recentUrls: newRecents });
    } catch (e) {
        // Ignore
    }
};

/**
 * @deprecated Use ChromeStorageAdapter for new code - this will be removed in a future version
 */
export const clearState = async () => {
    await chrome.storage.local.remove(STORAGE_KEY);
};
