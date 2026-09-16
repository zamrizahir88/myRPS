import type { ReactNode } from 'react'
import { useI18n } from '../i18n'
import { useTheme } from '../hooks/useTheme'
import AuthHero from './AuthHero'

/**
 * Signed-out pages. Split layout: a navy panel carrying the identity and the
 * 7 Pillars on the left, the form on the right. On a phone the panel becomes a
 * compact header so the form stays above the fold.
 */
export default function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  const { t, toggle } = useI18n()
  const { theme, toggle: toggleTheme } = useTheme()

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <AuthHero />

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-3 flex items-center justify-end gap-1.5">
            <button onClick={toggleTheme} className="btn-ghost px-2.5 py-1.5 text-xs">
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <button onClick={toggle} className="btn-ghost px-2.5 py-1.5 text-xs font-bold">
              {t.nav.language}
            </button>
          </div>

          <div className="card animate-fade-up">
            <h2 className="mb-5 font-display text-xl font-extrabold tracking-tight">{title}</h2>
            {children}
          </div>

          <p className="mt-5 text-center text-[11px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
            {t.app.disclaimer}
          </p>
          <p className="mt-2 text-center text-[11px]" style={{ color: 'var(--text-3)' }}>
            © Copyright reserved. Developed by <span className="font-semibold">Zamm Studio</span>
            <br />
            Ts. Dr. Mohd Zamri Bin Zahir Ahmad
          </p>
        </div>
      </div>
    </div>
  )
}
