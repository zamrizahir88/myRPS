import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
    isActive ? 'bg-series-1 text-white' : 'text-ink-secondary hover:bg-surface-plane hover:text-ink'
  }`

export default function Layout() {
  const { t, toggle } = useI18n()
  const { profile, isAdmin, signOut } = useAuth()

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-hairline bg-white/95 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="flex h-14 items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold tracking-tight text-series-1">myRPS</span>
              <span className="hidden text-xs text-ink-muted sm:inline">{t.app.tagline}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggle} className="btn-ghost px-2.5 py-1.5 text-xs" title="Bahasa / Language">
                {t.nav.language}
              </button>
              <button onClick={signOut} className="btn-ghost px-2.5 py-1.5 text-xs">
                {t.nav.signOut}
              </button>
            </div>
          </div>

          {/* horizontal scroll rather than a wrapped mess on a phone */}
          <nav className="-mx-1 flex gap-1 overflow-x-auto pb-2">
            <NavLink to="/" end className={linkClass}>{t.nav.dashboard}</NavLink>
            <NavLink to="/profile" className={linkClass}>{t.nav.profile}</NavLink>
            <NavLink to="/academic" className={linkClass}>{t.nav.academic}</NavLink>
            <NavLink to="/psychometric" className={linkClass}>{t.nav.psychometric}</NavLink>
            <NavLink to="/pillars" className={linkClass}>{t.nav.pillars}</NavLink>
            <NavLink to="/community" className={linkClass}>{t.nav.community}</NavLink>
            {isAdmin && <NavLink to="/admin" className={linkClass}>{t.nav.admin}</NavLink>}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">
        <Outlet />
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-8 pt-4">
        <p className="text-xs leading-relaxed text-ink-muted">
          {t.app.disclaimer}
          {profile?.matric_no && <> · {profile.matric_no}</>}
        </p>
      </footer>
    </div>
  )
}
