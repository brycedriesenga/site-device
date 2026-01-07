export interface AppState {
    url: string
    recentUrls: string[]
}

const STORAGE_KEY = 'site-device-app-state-v1'

const defaultState: AppState = {
    url: '',
    recentUrls: [],
}

function isValidState(value: unknown): value is AppState {
    if (!value || typeof value !== 'object') return false
    const v = value as Record<string, unknown>
    if (typeof v.url !== 'string') return false
    if (!Array.isArray(v.recentUrls) || !v.recentUrls.every((u) => typeof u === 'string')) return false
    return true
}

export const AppStateStorage = {
    async load(): Promise<AppState> {
        try {
            const result = await chrome.storage.local.get(STORAGE_KEY)
            const stored = result[STORAGE_KEY]
            if (isValidState(stored)) return stored
            return defaultState
        } catch (error) {
            console.error('[SiteDevice][AppStateStorage] Failed to load app state', error)
            return defaultState
        }
    },

    async save(state: AppState): Promise<void> {
        try {
            await chrome.storage.local.set({ [STORAGE_KEY]: state })
        } catch (error) {
            console.error('[SiteDevice][AppStateStorage] Failed to save app state', error)
        }
    },

    async clear(): Promise<void> {
        try {
            await chrome.storage.local.remove(STORAGE_KEY)
        } catch (error) {
            console.error('[SiteDevice][AppStateStorage] Failed to clear app state', error)
        }
    },
}
