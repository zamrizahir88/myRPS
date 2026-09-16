import type { ReactNode } from 'react'

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm"
         style={{ color: 'var(--text-2)' }}>
      <span
        className="h-4 w-4 animate-spin rounded-full border-2"
        style={{ borderColor: 'var(--border)', borderTopColor: 'var(--brand)' }}
      />
      {label}
    </div>
  )
}

export function StatTile({
  label, value, sub, tone = 'default',
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'default' | 'good' | 'warning' | 'critical'
}) {
  // The status hues are mark colours; as text they are unreadable (amber on
  // white measures 1.8:1). The tint inks are the readable pair.
  const toneColor = {
    default: 'var(--text)',
    good: 'var(--tint-good-ink)',
    warning: 'var(--tint-warn-ink)',
    critical: 'var(--tint-bad-ink)',
  }[tone]
  return (
    <div className="card">
      <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-extrabold tracking-tight" style={{ color: toneColor }}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs" style={{ color: 'var(--text-2)' }}>{sub}</div>}
    </div>
  )
}

export function Alert({
  tone = 'info', children,
}: {
  tone?: 'info' | 'good' | 'warning' | 'critical'
  children: ReactNode
}) {
  const styles = {
    info: 'tint-info border-[color:var(--border)]',
    good: 'tint-good border-[color:var(--tint-good-ink)]/25',
    warning: 'tint-warn border-[color:var(--tint-warn-ink)]/25',
    critical: 'tint-bad border-[color:var(--tint-bad-ink)]/25',
  }[tone]
  return (
    <div className={`rounded-xl border px-3.5 py-2.5 text-sm ${styles}`} role="status">
      {children}
    </div>
  )
}

export function Field({
  label, hint, children, required,
}: {
  label: string
  hint?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="label">
        {label}
        {required && <span style={{ color: 'var(--danger-text)' }}> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs" style={{ color: 'var(--text-3)' }}>{hint}</span>}
    </label>
  )
}

export function Modal({
  open, onClose, title, children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl p-5 sm:rounded-2xl"
        style={{ background: 'var(--surface)' }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-extrabold tracking-tight">{title}</h2>
          <button onClick={onClose} style={{ color: 'var(--text-3)' }} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Avatar({ name, url, size = 36 }: { name: string | null; url?: string | null; size?: number }) {
  const initials = (name ?? '?')
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? ''}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size, height: size, fontSize: size * 0.38,
        // solid colour first: a gradient alone leaves backgroundColor
        // transparent, which breaks contrast checking and any fallback
        backgroundColor: '#1A2A6C',
        backgroundImage: 'linear-gradient(135deg, #2E5BBF, #1A2A6C)',
      }}
      aria-hidden
    >
      {initials || '?'}
    </div>
  )
}
