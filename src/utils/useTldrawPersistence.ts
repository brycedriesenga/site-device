import { useEffect } from 'react'
import { type Editor, type TLEditorSnapshot } from 'tldraw'
import { ChromeStorageAdapter } from './ChromeStorageAdapter'

const SAVE_DEBOUNCE_MS = 1_000

export function useTldrawPersistence(editor: Editor | null, isReady: boolean) {
  useEffect(() => {
    if (!editor || !isReady) return

    let saveTimeout: number | null = null
    let pendingSnapshot: TLEditorSnapshot | null = null

    const flush = () => {
      if (!pendingSnapshot) return
      ChromeStorageAdapter.save(pendingSnapshot)
      pendingSnapshot = null
    }

    const init = async () => {
      const snapshot = await ChromeStorageAdapter.load()
      if (!snapshot) return

      try {
        editor.loadSnapshot(snapshot)
      } catch (error) {
        console.error('[SiteDevice][Persistence] Failed to load snapshot into editor, clearing corrupt state', error)
        await ChromeStorageAdapter.clear()
      }
    }

    init()

    const unlisten = editor.store.listen(
      () => {
        pendingSnapshot = editor.getSnapshot()

        if (saveTimeout) window.clearTimeout(saveTimeout)
        saveTimeout = window.setTimeout(() => {
          flush()
          saveTimeout = null
        }, SAVE_DEBOUNCE_MS)
      },
      { scope: 'all' }
    )

    return () => {
      if (saveTimeout) {
        window.clearTimeout(saveTimeout)
        flush()
      }
      unlisten()
    }
  }, [editor, isReady])
}
