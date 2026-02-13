import type { TLEditorSnapshot } from 'tldraw'

const STORE_KEY = 'site-device-tldraw-persistence-v1'

export const ChromeStorageAdapter = {
  async save(snapshot: TLEditorSnapshot) {
    try {
      await chrome.storage.local.set({ [STORE_KEY]: snapshot })
    } catch (error) {
      console.error('Failed to save tldraw snapshot to chrome.storage:', error)
    }
  },

  async load(): Promise<TLEditorSnapshot | null> {
    try {
      const result = await chrome.storage.local.get(STORE_KEY)
      return (result[STORE_KEY] as TLEditorSnapshot) || null
    } catch (error) {
      console.error('Failed to load tldraw snapshot from chrome.storage:', error)
      return null
    }
  }
}
