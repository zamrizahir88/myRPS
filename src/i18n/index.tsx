import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { en, type Dict } from './en'
import { ms } from './ms'

export type Locale = 'en' | 'ms'

const DICTS: Record<Locale, Dict> = { en, ms }
const STORAGE_KEY = 'myrps.locale'

interface I18nValue {
  locale: Locale
  t: Dict
  /** Fills {placeholders} in a string. */
  f: (template: string, vars: Record<string, string | number>) => string
  toggle: () => void
}

const I18nContext = createContext<I18nValue | null>(null)

function readStored(): Locale {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'en' || v === 'ms') return v
  } catch {
    // private mode / blocked storage — fall through to the default
  }
  return 'ms'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(readStored)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // not fatal — the toggle just won't persist
    }
    document.documentElement.lang = locale === 'ms' ? 'ms' : 'en'
  }, [locale])

  const f = useCallback(
    (template: string, vars: Record<string, string | number>) =>
      template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)),
    [],
  )

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      t: DICTS[locale],
      f,
      toggle: () => setLocale((l) => (l === 'en' ? 'ms' : 'en')),
    }),
    [locale, f],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
