import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import { disablePush, enablePush, pushState, refreshPush, type PushState } from '../lib/push'
import { useToast } from './Toast'
import { Modal } from './ui'

const DISMISS_KEY = 'myrps.pushDismissed'

interface NotificationsValue {
  state: PushState | null
  busy: boolean
  /** On if it is off, off if it is on; otherwise explains what is in the way. */
  toggle: () => void
}

const NotificationsContext = createContext<NotificationsValue>({ state: null, busy: false, toggle: () => {} })

/**
 * One owner for the bell's state, so the button in the header and the banner
 * on the feed always agree, and the "why can't I" sheet lives somewhere that
 * outlasts both.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n()
  const { session } = useAuth()
  const { show } = useToast()
  const userId = session?.user.id
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [help, setHelp] = useState<'blocked' | 'needs-install' | 'unsupported' | null>(null)

  useEffect(() => {
    if (!userId) { setState(null); return }
    let active = true
    void (async () => {
      try {
        await refreshPush(locale)
        const next = await pushState()
        if (active) setState(next)
      } catch {
        if (active) setState('unsupported')
      }
    })()
    return () => { active = false }
    // The language is saved with the subscription, so a change re-saves it.
  }, [userId, locale])

  const toggle = useCallback(() => {
    if (busy || !state || state === 'unconfigured') return
    if (state === 'blocked' || state === 'needs-install' || state === 'unsupported') {
      setHelp(state)
      return
    }
    setBusy(true)
    void (async () => {
      try {
        const next = state === 'on' ? await disablePush() : await enablePush(locale)
        setState(next)
        if (next === 'on') show(t.notify.turnedOn)
        else if (next === 'blocked') setHelp('blocked')
        else if (state === 'on') show(t.notify.turnedOff, 'info')
      } catch {
        show(t.notify.failed, 'critical')
      } finally {
        setBusy(false)
      }
    })()
  }, [busy, state, locale, show, t])

  const value = useMemo(() => ({ state, busy, toggle }), [state, busy, toggle])

  const steps =
    help === 'blocked' ? t.notify.blockedSteps
    : help === 'needs-install' ? t.notify.installSteps
    : []

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      {/* A portal: the bell sits in the header, whose backdrop blur would
          otherwise become the box a "fixed" sheet is positioned in. */}
      {createPortal(
        <Modal
          open={help !== null}
          onClose={() => setHelp(null)}
          title={help === 'needs-install' ? t.notify.installTitle : t.notify.blockedTitle}
        >
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            {help === 'blocked' ? t.notify.blockedBody
              : help === 'needs-install' ? t.notify.installBody
              : t.notify.unsupportedBody}
          </p>
          {steps.length > 0 && (
            <ol className="mt-3 space-y-2.5 text-sm">
              {steps.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tint-info">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          )}
          <button onClick={() => setHelp(null)} className="btn-primary mt-5 w-full">{t.install.done}</button>
        </Modal>,
        document.body,
      )}
    </NotificationsContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationsContext)

/** The bell in the header: one tap on, one tap off. */
export function NotificationBell() {
  const { t } = useI18n()
  const { state, busy, toggle } = useNotifications()
  // Not set up for this project yet, or still finding out: show nothing
  // rather than a button that cannot do anything.
  if (!state || state === 'unconfigured') return null
  const on = state === 'on'

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={on}
      aria-label={on ? t.notify.labelOn : t.notify.labelOff}
      title={on ? t.notify.labelOn : t.notify.labelOff}
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-[color:var(--surface-2)] disabled:opacity-60"
      style={{ color: on ? 'var(--brand)' : 'var(--text-3)' }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor"
           strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" fill="none" />
        {!on && <path d="M3 3l18 18" />}
      </svg>
      {on && (
        <span
          className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full"
          style={{ background: 'var(--status-good)', boxShadow: '0 0 0 2px var(--surface)' }}
          aria-hidden
        />
      )}
    </button>
  )
}

/**
 * Once, on the feed, for someone who has never been asked. After "Not now"
 * the bell in the header is where it lives.
 */
export function NotificationBanner() {
  const { t } = useI18n()
  const { state, busy, toggle } = useNotifications()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  if (dismissed || (state !== 'off' && state !== 'needs-install')) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // blocked storage — it will simply offer again next visit
    }
  }

  return (
    <div className="card flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl tint-info" aria-hidden>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-tight">{t.notify.bannerTitle}</p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-2)' }}>{t.notify.bannerBody}</p>
        <div className="mt-2 flex gap-2">
          <button onClick={toggle} disabled={busy} className="btn-primary px-3 py-1.5 text-xs">
            {t.notify.turnOn}
          </button>
          <button onClick={dismiss} className="btn-ghost px-3 py-1.5 text-xs">{t.install.later}</button>
        </div>
      </div>
    </div>
  )
}
