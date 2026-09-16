import { useCallback, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'
const KEY = 'myrps.theme'

/** Remembers the choice per device; falls back to the OS setting. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(KEY)
      if (stored === 'light' || stored === 'dark') return stored
    } catch {
      // private mode or blocked storage — use the OS preference
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0A0F22' : '#1A2A6C')
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      // not fatal — the toggle just won't persist
    }
  }, [theme])

  return { theme, toggle: useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []) }
}
