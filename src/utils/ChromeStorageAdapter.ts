import type { TLEditorSnapshot } from 'tldraw'

const STORE_KEY = 'site-device-tldraw-persistence-v1'

export const ChromeStorageAdapter = {
  async save(snapshot: TLEditorSnapshot) {
    try {
      await chrome.storage.local.set({ [STORE_KEY]: snapshot })
    } catch (error) {
      console.error('[SiteDevice][Persistence] Failed to save tldraw snapshot', error)
    }
  },

  async load(): Promise<TLEditorSnapshot | null> {
    try {
      const result = await chrome.storage.local.get(STORE_KEY)
      return (result[STORE_KEY] as TLEditorSnapshot) || null
    } catch (error) {
      console.error('[SiteDevice][Persistence] Failed to load tldraw snapshot', error)
      return null
    }
  },

  async clear(): Promise<void> {
    try {
      await chrome.storage.local.remove(STORE_KEY)
    } catch (error) {
      console.error('[SiteDevice][Persistence] Failed to clear tldraw snapshot', error)
    }
  },
}
