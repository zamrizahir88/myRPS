import type { ReactNode } from 'react'
import { useI18n } from '../i18n'
import { useTheme } from '../hooks/useTheme'
import { Logo } from './Brand'
import { PILLARS } from '../lib/pillars'

/**
 * Signed-out pages. Split layout: a navy panel carrying the identity and the
 * 7 Pillars on the left, the form on the right. On a phone the panel becomes a
 * compact header so the form stays above the fold.
 */
export default function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  const { t, toggle, locale } = useI18n()
  const { theme, toggle: toggleTheme } = useTheme()

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <aside
        className="relative overflow-hidden px-6 py-8 lg:w-[46%] lg:px-12 lg:py-14"
        style={{ background: 'linear-gradient(150deg, #1A2A6C 0%, #131F50 55%, #0C1435 100%)' }}
      >
        {/* gold arc, echoing the crest */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-20 blur-2xl"
          style={{ background: '#FFC627' }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <Logo size={44} />
            <div>
              <p className="font-display text-2xl font-extrabold tracking-tight text-white">myRPS</p>
              <p className="text-xs font-medium text-gold">{t.app.tagline}</p>
            </div>
          </div>

          <h1 className="mt-8 hidden font-display text-3xl font-extrabold leading-tight text-white lg:block xl:text-4xl">
            {locale === 'ms'
              ? 'Pantau kemajuan anda. Bersama RPS anda.'
              : 'Track your progress. Alongside your RPS.'}
          </h1>
          <p className="mt-3 hidden max-w-md text-sm leading-relaxed text-white/70 lg:block">
            {locale === 'ms'
              ? 'Kredit, 7 Pillars, ujian psikometrik dan rekod pertemuan — semuanya di satu tempat.'
              : 'Credits, the 7 Pillars, your psychometric profile and every meeting — in one place.'}
          </p>

          <ul className="mt-8 hidden flex-wrap gap-2 lg:flex">
            {PILLARS.map((p, i) => (
              <li
                key={p.code}
                className="rounded-full border border-white/15 bg-[color:var(--surface)]/5 px-3 py-1.5 text-[11px] font-medium text-white/80"
              >
                <span className="text-gold">P{i + 1}</span>{' '}
                {locale === 'ms' ? p.name_ms : p.name_en}
              </li>
            ))}
          </ul>
        </div>
      </aside>

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
