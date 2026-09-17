import { Component, type ReactNode } from 'react'
import { RPS_EMAIL } from '../lib/supabase'

/**
 * Without this, one thrown component renders a completely blank white page —
 * a student would see nothing at all and assume the site is down.
 */
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('[myRPS] render failed:', error)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="card max-w-md text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full tint-warn text-xl">
            !
          </div>
          <h1 className="font-display text-lg font-extrabold">Something went wrong</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-2)' }}>
            Ada masalah teknikal. Cuba muat semula halaman ini.
            <br />
            A technical problem stopped this page loading. Please reload.
          </p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-4 w-full">
            Muat semula · Reload
          </button>
          {RPS_EMAIL && (
            <p className="mt-3 text-xs" style={{ color: 'var(--text-3)' }}>
              Still broken?{' '}
              <a
                href={`mailto:${RPS_EMAIL}?subject=myRPS error&body=${encodeURIComponent(
                  String(this.state.error?.message ?? ''),
                )}`}
                className="font-semibold"
                style={{ color: 'var(--brand)' }}
              >
                {RPS_EMAIL}
              </a>
            </p>
          )}
          <details className="mt-3 text-left">
            <summary className="cursor-pointer text-xs" style={{ color: 'var(--text-3)' }}>
              Technical detail
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-lg p-2 text-[11px]"
                 style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
              {this.state.error?.message}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}
