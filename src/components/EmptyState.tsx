import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * A brand-new student sees 0/140 credits, no terms, no pillars and an empty
 * feed. Left bare that reads as broken; every empty view should say what it
 * is for and offer the one action that fills it.
 */
export default function EmptyState({
  icon, title, body, actionLabel, actionTo, onAction,
}: {
  icon: ReactNode
  title: string
  body: string
  actionLabel?: string
  actionTo?: string
  onAction?: () => void
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
      >
        {icon}
      </div>
      <h3 className="font-display text-base font-extrabold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
        {body}
      </p>
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn-primary mt-4">{actionLabel}</Link>
      )}
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary mt-4">{actionLabel}</button>
      )}
    </div>
  )
}

const s = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
export const EmptyIcons = {
  chat: <svg {...s}><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z" /></svg>,
  book: <svg {...s}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z" /></svg>,
  star: <svg {...s}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z" /></svg>,
  people: <svg {...s}><circle cx="9" cy="8" r="3.5" /><path d="M2 21a7 7 0 0 1 14 0M17 4.5a3.5 3.5 0 0 1 0 7" /></svg>,
  calendar: <svg {...s}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18" /></svg>,
  check: <svg {...s}><path d="M20 6 9 17l-5-5" /></svg>,
}
