import { useSyncExternalStore } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Nobody finds "Add to Home Screen" on their own. Chrome, Edge and Samsung
 * Internet fire an event we can turn into a real button; iOS Safari and some
 * others (Huawei Browser, Firefox) do not, so there we can only say where the
 * option lives.
 *
 * The event fires once, soon after the page loads — usually on the sign-in
 * screen, long before the menu that offers the button exists. So it is caught
 * here, when the module loads, and kept for whoever asks later.
 */
let deferred: BeforeInstallPromptEvent | null = null
let version = 0
const listeners = new Set<() => void>()
const changed = () => { version++; listeners.forEach((l) => l()) }

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    (window.matchMedia?.('(display-mode: standalone)').matches ?? false) ||
    // iOS Safari's own flag for "opened from the home screen"
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

let installed = isStandalone()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    changed()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    deferred = null
    changed()
  })
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
const snapshot = () => version

export function useInstallPrompt() {
  useSyncExternalStore(subscribe, snapshot)
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)

  return {
    /** A real install button is possible. */
    canInstall: !!deferred && !installed,
    /** iOS: no event, so show the Share → Add to Home Screen hint instead. */
    showIosHint: isIos && !installed,
    isIos,
    installed,
    install: async () => {
      if (!deferred) return
      const event = deferred
      await event.prompt()
      await event.userChoice
      // A prompt can be shown once; the browser fires a new event if it will
      // offer again.
      deferred = null
      changed()
    },
  }
}
