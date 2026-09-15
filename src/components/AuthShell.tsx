import type { ReactNode } from 'react'
import { useI18n } from '../i18n'

export default function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  const { t, toggle } = useI18n()
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-series-1">myRPS</h1>
          <p className="mt-1 text-sm text-ink-secondary">{t.app.tagline}</p>
        </div>

        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">{title}</h2>
            <button onClick={toggle} className="btn-ghost px-2 py-1 text-xs">{t.nav.language}</button>
          </div>
          {children}
        </div>

        <p className="mt-5 text-center text-xs leading-relaxed text-ink-muted">{t.app.disclaimer}</p>
      </div>
    </div>
  )
}
