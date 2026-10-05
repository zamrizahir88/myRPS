import type { Dict } from '../i18n/en'
import type { Locale } from '../i18n'
import type { MemberPresence } from './types'

type Fill = (template: string, vars: Record<string, string | number>) => string

const dateLocale = (locale: Locale) => (locale === 'ms' ? 'ms-MY' : 'en-MY')

function minutesSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000))
}

/** "Active now", "Active 2h ago" — the full sentence, for a profile. */
export function activeLabel(
  m: Pick<MemberPresence, 'is_online' | 'last_active_at'> | undefined,
  t: Dict, f: Fill, locale: Locale,
): string {
  if (!m) return ''
  if (m.is_online) return t.presence.activeNow
  if (!m.last_active_at) return t.presence.never
  const mins = minutesSince(m.last_active_at)
  // Offline but under a minute would read "0m ago"; the floor is the three
  // minutes the database waits before calling someone offline anyway.
  if (mins < 60) return f(t.presence.activeMinutes, { n: Math.max(1, mins) })
  if (mins < 1440) return f(t.presence.activeHours, { n: Math.round(mins / 60) })
  if (mins < 10080) return f(t.presence.activeDays, { n: Math.round(mins / 1440) })
  return f(t.presence.activeOn, {
    date: new Date(m.last_active_at).toLocaleDateString(dateLocale(locale), { day: 'numeric', month: 'short' }),
  })
}

/** "5m", "2h", "3d" ("2 jam", "3 hari") — for a list row, where the sentence does not fit. */
export function activeShort(
  m: Pick<MemberPresence, 'is_online' | 'last_active_at'>, locale: Locale,
): string {
  if (m.is_online || !m.last_active_at) return ''
  const mins = minutesSince(m.last_active_at)
  if (mins < 60) return locale === 'ms' ? `${Math.max(1, mins)} min` : `${Math.max(1, mins)}m`
  if (mins < 1440) return locale === 'ms' ? `${Math.round(mins / 60)} jam` : `${Math.round(mins / 60)}h`
  if (mins < 10080) return locale === 'ms' ? `${Math.round(mins / 1440)} hari` : `${Math.round(mins / 1440)}d`
  return new Date(m.last_active_at).toLocaleDateString(dateLocale(locale), { day: 'numeric', month: 'short' })
}

/** A sign-in time, in full: this is the one a student checks was really them. */
export function loginTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(dateLocale(locale), {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

/** "Muhammad Rusydi bin Rahimie" is too long under a 48px photo. */
export function firstName(name: string | null): string {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/)
  // "Muhammad", "Mohd", "Nur" and the like are shared by half the class; the
  // name people are actually called by is the next one.
  const common = /^(muhammad|muhamad|mohammad|mohamad|mohd|muhd|md|nur|nurul|siti|ahmad|abdul|ts|dr|prof|ir)\.?$/i
  const pick = parts.find((p) => !common.test(p)) ?? parts[0]
  return pick.replace(/[.,]/g, '')
}
