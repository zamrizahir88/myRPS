import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import { useOnline } from '../hooks/useOnline'
import { Logo, Wordmark } from './Brand'
import AvatarMenu from './AvatarMenu'
import Footer from './Footer'

// An underline reads better than a filled pill on a short bar, and keeps the
// brand colour for things that are actually actions.
const desktopLink = ({ isActive }: { isActive: boolean }) =>
  `relative rounded-lg px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition ${
    isActive
      ? 'text-[color:var(--brand)] after:absolute after:inset-x-3 after:-bottom-px after:h-[3px] after:rounded-full after:bg-[color:var(--brand)]'
      : 'text-[color:var(--text-2)] hover:text-[color:var(--text)]'
  }`

const mobileLink = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition ${
    isActive ? 'text-[color:var(--brand)]' : 'text-[color:var(--text-3)]'
  }`

interface Item { to: string; label: string; icon: JSX.Element; end?: boolean; badge?: number }

export default function Layout() {
  const { t, f } = useI18n()
  const { isAdmin, showAdminUi, previewAsStudent, setPreviewAsStudent } = useAuth()
  const online = useOnline()
  const [pending, setPending] = useState(0)

  // The approval queue must be impossible to miss from anywhere, but an empty
  // queue should not occupy a permanent slot.
  useEffect(() => {
    if (!showAdminUi) return
    void (async () => {
      const { count } = await supabase
        .from('profiles').select('id', { count: 'exact', head: true })
        .eq('approval_state', 'pending')
      setPending(count ?? 0)
    })()
  }, [showAdminUi])

  const items: Item[] = showAdminUi
    ? [
        { to: '/feed', label: t.nav.feed, icon: <IconChat /> },
        { to: '/admin', label: t.nav.myStudents, icon: <IconPeople />, end: true },
        { to: '/admin/curriculum', label: t.nav.curriculum, icon: <IconBook /> },
        { to: '/profile', label: t.nav.profile, icon: <IconUser /> },
        ...(pending > 0
          ? [{ to: '/admin/applications', label: t.nav.applications, icon: <IconInbox />, badge: pending }]
          : []),
      ]
    : [
        { to: '/', label: t.nav.feed, icon: <IconChat />, end: true },
        { to: '/me', label: t.nav.myProgress, icon: <IconHome /> },
        { to: '/academic', label: t.nav.academic, icon: <IconChart /> },
        { to: '/pillars', label: t.nav.pillars, icon: <IconStar /> },
        { to: '/profile', label: t.nav.profile, icon: <IconUser /> },
      ]

  return (
    <div className="flex min-h-full flex-col">
      {!online && (
        <div className="tint-warn px-4 py-1.5 text-center text-xs font-semibold">
          {t.nav.offline}
        </div>
      )}

      <header
        className="sticky top-0 z-40 border-b backdrop-blur"
        style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--surface) 88%, transparent)' }}
      >
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="flex h-[4.25rem] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Logo size={42} />
              <div className="min-w-0">
                <Wordmark className="text-xl sm:text-[1.4rem]" />
                <p className="truncate text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>
                  {t.app.tagline}
                </p>
              </div>
            </div>
            <AvatarMenu />
          </div>

          <nav className="hidden gap-1 pb-1 md:flex">
            {items.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end} className={desktopLink}>
                {i.label}
                {i.badge ? <Badge n={i.badge} /> : null}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {isAdmin && previewAsStudent && (
        <div className="bg-gold px-4 py-2 text-center text-xs font-semibold text-[color:var(--accent-ink)]">
          {t.nav.previewBanner}{' '}
          <button onClick={() => setPreviewAsStudent(false)} className="underline underline-offset-2">
            {t.nav.exitPreview}
          </button>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-24 md:pb-5">
        <Outlet />
      </main>

      <Footer />

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t md:hidden"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--surface)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className={mobileLink}>
            <span className="relative">
              {i.icon}
              {i.badge ? (
                <span
                  className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                  style={{ background: 'var(--status-critical)' }}
                >
                  {i.badge}
                </span>
              ) : null}
            </span>
            {i.label}
          </NavLink>
        ))}
      </nav>

      {/* keeps the badge string in use for screen readers on desktop */}
      <span className="sr-only">{pending > 0 ? f(t.nav.applicationsBadge, { n: pending }) : ''}</span>
    </div>
  )
}

function Badge({ n }: { n: number }) {
  return (
    <span
      className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
      style={{ background: 'var(--status-critical)' }}
    >
      {n}
    </span>
  )
}

const s = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const IconHome = () => <svg {...s}><path d="M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" /></svg>
const IconChart = () => <svg {...s}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
const IconStar = () => <svg {...s}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z" /></svg>
const IconChat = () => <svg {...s}><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z" /></svg>
const IconUser = () => <svg {...s}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
const IconPeople = () => <svg {...s}><circle cx="9" cy="8" r="3.5" /><path d="M2 21a7 7 0 0 1 14 0M17 4.5a3.5 3.5 0 0 1 0 7M18 21a6.5 6.5 0 0 0-2-4.7" /></svg>
const IconInbox = () => <svg {...s}><path d="M3 13h5l1.5 3h5L16 13h5M4 5h16l1 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6Z" /></svg>
const IconBook = () => <svg {...s}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5ZM4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5Z" /></svg>
