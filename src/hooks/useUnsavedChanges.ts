import { useEffect } from 'react'

/**
 * Warns before a tab close or reload while a form has unsaved edits.
 *
 * Belt and braces after the profile form was silently re-seeded mid-typing:
 * even with that fixed, losing a long form to a stray reload is miserable.
 */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])
}
