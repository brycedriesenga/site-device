import { useEffect } from 'react'
import { type Editor } from 'tldraw'
import { ChromeStorageAdapter } from './ChromeStorageAdapter'

export function useTldrawPersistence(editor: Editor | null, isReady: boolean) {
  useEffect(() => {
    if (!editor || !isReady) return

    const init = async () => {
      const snapshot = await ChromeStorageAdapter.load()
      if (snapshot) {
        try {
          editor.loadSnapshot(snapshot)
        } catch (e) {
          console.error('Failed to load snapshot into editor', e)
        }
      }
    }

    init()

    const unlisten = editor.store.listen(
      () => {
        const snapshot = editor.getSnapshot()
        ChromeStorageAdapter.save(snapshot)
      },
      { scope: 'all', source: 'user' }
    )

    return () => unlisten()
  }, [editor, isReady])
}
