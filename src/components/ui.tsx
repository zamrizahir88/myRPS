import type { ReactNode } from 'react'

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm text-ink-secondary">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-hairline border-t-series-1" />
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
  const toneColor = {
    default: 'var(--text-primary)',
    good: 'var(--status-good)',
    warning: 'var(--status-warning)',
    critical: 'var(--status-critical)',
  }[tone]
  return (
    <div className="card">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold" style={{ color: toneColor }}>{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-secondary">{sub}</div>}
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
    info: 'bg-[#eef4fd] text-[#184f95] border-[#cde2fb]',
    good: 'bg-[#e9f7e9] text-[#046004] border-[#c3e8c3]',
    warning: 'bg-[#fdf4e0] text-[#7a5600] border-[#f6e0ae]',
    critical: 'bg-[#fdecec] text-[#8f2727] border-[#f6cccc]',
  }[tone]
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${styles}`} role="status">
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
        {required && <span className="text-status-critical"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
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
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink" aria-label="Close">✕</button>
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
      className="flex shrink-0 items-center justify-center rounded-full bg-[#e4eefb] font-semibold text-[#184f95]"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials || '?'}
    </div>
  )
}
