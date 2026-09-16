import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import { useTheme } from '../hooks/useTheme'
import { Logo, Wordmark } from './Brand'
import Footer from './Footer'
import { Avatar } from './ui'

const desktopLink = ({ isActive }: { isActive: boolean }) =>
  `rounded-xl px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition ${
    isActive
      ? 'bg-[color:var(--brand)] text-white shadow-card'
      : 'text-[color:var(--text-2)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text)]'
  }`

const mobileLink = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition ${
    isActive ? 'text-[color:var(--brand)]' : 'text-[color:var(--text-3)]'
  }`

interface Item { to: string; label: string; icon: JSX.Element; end?: boolean }

export default function Layout() {
  const { t, toggle } = useI18n()
  const { profile, isAdmin, showAdminUi, previewAsStudent, setPreviewAsStudent, signOut } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()

  const items: Item[] = showAdminUi
    ? [
        { to: '/admin', label: t.nav.myStudents, icon: <IconPeople />, end: true },
        { to: '/admin/applications', label: t.nav.applications, icon: <IconInbox /> },
        { to: '/admin/curriculum', label: t.nav.curriculum, icon: <IconBook /> },
        { to: '/feed', label: t.nav.feed, icon: <IconChat /> },
        { to: '/profile', label: t.nav.profile, icon: <IconUser /> },
      ]
    : [
        { to: '/', label: t.nav.dashboard, icon: <IconHome />, end: true },
        { to: '/academic', label: t.nav.academic, icon: <IconChart /> },
        { to: '/pillars', label: t.nav.pillars, icon: <IconStar /> },
        { to: '/feed', label: t.nav.feed, icon: <IconChat /> },
        { to: '/profile', label: t.nav.profile, icon: <IconUser /> },
      ]

  return (
    <div className="flex min-h-full flex-col">
      <header
        className="sticky top-0 z-40 border-b backdrop-blur"
        style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--surface) 88%, transparent)' }}
      >
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Logo size={34} />
              <div className="min-w-0">
                <Wordmark />
                {showAdminUi ? (
                  <span className="ml-2 chip bg-navy-700 text-white">{t.nav.roleRps}</span>
                ) : null}
                <p className="truncate text-xs font-medium" style={{ color: 'var(--text-2)' }}>
                  {profile?.full_name ?? t.app.tagline}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button onClick={toggleTheme} className="btn-ghost px-2.5 py-2" aria-label="Theme">
                {theme === 'dark' ? <IconSun /> : <IconMoon />}
              </button>
              <button onClick={toggle} className="btn-ghost px-2.5 py-2 text-xs font-bold">
                {t.nav.language}
              </button>
              <button onClick={signOut} className="btn-ghost hidden px-3 py-2 text-xs sm:inline-flex">
                {t.nav.signOut}
              </button>
              <Avatar name={profile?.full_name ?? null} size={32} />
            </div>
          </div>

          {/* Desktop navigation. On a phone this is replaced by the bar below. */}
          <nav className="hidden gap-1.5 pb-2.5 md:flex">
            {items.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end} className={desktopLink}>
                {i.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Sitting in the student view as the RPS — say so loudly, and give a
          one-click way out. */}
      {isAdmin && previewAsStudent && (
        <div className="bg-gold px-4 py-2 text-center text-xs font-semibold text-[color:var(--accent-ink)]">
          {t.nav.previewBanner}{' '}
          <button onClick={() => setPreviewAsStudent(false)} className="underline underline-offset-2">
            {t.nav.exitPreview}
          </button>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-24 md:pb-5">
        {isAdmin && !previewAsStudent && (
          <div className="mb-4 flex justify-end">
            <button onClick={() => setPreviewAsStudent(true)} className="btn-ghost px-3 py-1.5 text-xs">
              {t.nav.previewAsStudent}
            </button>
          </div>
        )}
        <Outlet />
      </main>

      <Footer />

      {/* Phone navigation: a real tab bar, sitting above the home indicator. */}
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
            {i.icon}
            {i.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

/* 20px stroke icons, sized for a tab bar */
const s = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const IconHome = () => <svg {...s}><path d="M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" /></svg>
const IconChart = () => <svg {...s}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
const IconStar = () => <svg {...s}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z" /></svg>
const IconChat = () => <svg {...s}><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z" /></svg>
const IconUser = () => <svg {...s}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
const IconPeople = () => <svg {...s}><circle cx="9" cy="8" r="3.5" /><path d="M2 21a7 7 0 0 1 14 0M17 4.5a3.5 3.5 0 0 1 0 7M18 21a6.5 6.5 0 0 0-2-4.7" /></svg>
const IconInbox = () => <svg {...s}><path d="M3 13h5l1.5 3h5L16 13h5M4 5h16l1 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6Z" /></svg>
const IconBook = () => <svg {...s}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5ZM4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5Z" /></svg>
const IconSun = () => <svg {...s}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
const IconMoon = () => <svg {...s}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
