import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { activeShort, firstName } from '../lib/presence'
import { Avatar } from './ui'
import type { MemberPresence } from '../lib/types'

interface Props {
  /** Already sorted: online first, then most recently active. */
  members: MemberPresence[]
  meId: string | undefined
  avatarFor: (userId: string) => string | null
}

const OPEN_KEY = 'myrps.cohortOpen'

/** Whether the full list is unfolded. Kept, so it is still open tomorrow. */
function useStoredOpen(): [boolean, () => void] {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(OPEN_KEY) === '1'
    } catch {
      return false
    }
  })
  const toggle = () =>
    setOpen((was) => {
      try {
        localStorage.setItem(OPEN_KEY, was ? '0' : '1')
      } catch {
        // blocked storage — the list just starts folded next time
      }
      return !was
    })
  return [open, toggle]
}

/**
 * You first, then whoever is here, then the rest. You are reading the page,
 * so you are online whatever the last heartbeat said.
 */
function useCohort(members: MemberPresence[], meId: string | undefined, query: string) {
  return useMemo(() => {
    const q = query.trim().toLowerCase()
    const all = members
      .map((m) => (m.user_id === meId ? { ...m, is_online: true } : m))
      .sort((a, b) => Number(b.user_id === meId) - Number(a.user_id === meId))
    const match = (m: MemberPresence) => !q || (m.full_name ?? '').toLowerCase().includes(q)
    return {
      total: all.length,
      onlineCount: all.filter((m) => m.is_online).length,
      online: all.filter((m) => m.is_online && match(m)),
      offline: all.filter((m) => !m.is_online && match(m)),
    }
  }, [members, meId, query])
}

function OnlineCount({ n }: { n: number }) {
  const { t, f } = useI18n()
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--tint-good-ink)' }}>
      <span className="h-2 w-2 rounded-full" style={{ background: 'var(--status-good)' }} aria-hidden />
      <span className="tnum">{f(t.presence.onlineCount, { n })}</span>
    </span>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n()
  return (
    <input
      className="input py-1.5 text-sm" type="search" placeholder={t.presence.search}
      value={value} onChange={(e) => onChange(e.target.value)}
    />
  )
}

/**
 * Phones: a row of faces you swipe sideways, above the composer. It is the
 * first thing on the screen because "who is here" is the reason to post.
 * "See everyone" unfolds the whole cohort underneath, in place.
 */
export function CohortStrip({ members, meId, avatarFor }: Props) {
  const { t, locale } = useI18n()
  const [open, toggle] = useStoredOpen()
  const [query, setQuery] = useState('')
  const all = useCohort(members, meId, '')
  const found = useCohort(members, meId, query)
  if (all.total === 0) return null

  // Everyone online, then enough recent faces that the row is never bare.
  const recent = all.offline.filter((m) => m.last_active_at)
  const faces = [...all.online, ...recent.slice(0, Math.max(0, 12 - all.online.length))]

  return (
    <section className="card px-0 py-3 lg:hidden" aria-label={t.presence.title}>
      <div className="flex items-center justify-between px-4">
        <OnlineCount n={all.onlineCount} />
        <button
          type="button" onClick={toggle} aria-expanded={open}
          className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--brand)' }}
        >
          {open ? t.presence.showLess : t.presence.seeAll} <Chevron open={open} />
        </button>
      </div>

      <ul className="mt-2.5 flex gap-1 overflow-x-auto px-3 pb-1" style={{ scrollbarWidth: 'none' }}>
        {faces.map((m) => (
          <li key={m.user_id} className="shrink-0">
            <Link
              to={`/u/${m.user_id}`}
              className="flex w-[4.25rem] flex-col items-center gap-1 rounded-lg py-1 text-center"
            >
              <span style={{ opacity: m.is_online ? 1 : 0.55 }}>
                <Avatar name={m.full_name} url={avatarFor(m.user_id)} size={48} online={m.is_online} />
              </span>
              <span className="w-full truncate text-[11px] font-semibold leading-tight">
                {m.user_id === meId ? t.presence.you : firstName(m.full_name)}
              </span>
              {!m.is_online && (
                <span className="tnum -mt-1 text-[10px] leading-none" style={{ color: 'var(--text-3)' }}>
                  {activeShort(m, locale)}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {open && (
        <div className="mt-2 border-t px-2 pt-3" style={{ borderColor: 'var(--border)' }}>
          {all.total > 8 && (
            <div className="mb-2 px-2"><SearchBox value={query} onChange={setQuery} /></div>
          )}
          <div className="max-h-[60vh] overflow-y-auto">
            <ul>
              {found.online.map((m) => (
                <PersonRow key={m.user_id} m={m} url={avatarFor(m.user_id)} locale={locale} size={40} isMe={m.user_id === meId} />
              ))}
            </ul>
            {found.offline.length > 0 && (
              <>
                <GroupLabel label={t.presence.offline} n={found.offline.length} />
                <ul>
                  {found.offline.map((m) => (
                    <PersonRow key={m.user_id} m={m} url={avatarFor(m.user_id)} locale={locale} size={40} />
                  ))}
                </ul>
              </>
            )}
            {found.online.length + found.offline.length === 0 && <NoMatch />}
          </div>
        </div>
      )}
    </section>
  )
}

/**
 * Wider screens: a contact list beside the feed. Everyone online is always
 * listed; the rest of the cohort unfolds underneath. It scrolls inside itself
 * so a large class does not push the leaderboard off the page.
 */
export function CohortCard({ members, meId, avatarFor }: Props) {
  const { t, locale } = useI18n()
  const [open, toggle] = useStoredOpen()
  const [query, setQuery] = useState('')
  const all = useCohort(members, meId, '')
  const found = useCohort(members, meId, open ? query : '')
  if (all.total === 0) return null

  return (
    <div className="card hidden lg:block">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="section-title">{t.presence.title}</h2>
        <OnlineCount n={all.onlineCount} />
      </div>

      {open && all.total > 8 && (
        <div className="mb-2"><SearchBox value={query} onChange={setQuery} /></div>
      )}

      <div className="-mx-2 max-h-[min(70vh,34rem)] overflow-y-auto">
        <ul>
          {found.online.map((m) => (
            <PersonRow
              key={m.user_id} m={m} url={avatarFor(m.user_id)} locale={locale}
              isMe={m.user_id === meId} compact
            />
          ))}
        </ul>

        {all.onlineCount <= 1 && (
          <p className="px-2 py-1 text-xs" style={{ color: 'var(--text-3)' }}>{t.presence.nobodyElse}</p>
        )}

        {all.offline.length > 0 && (
          <button
            type="button" onClick={toggle} aria-expanded={open}
            className="mt-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold"
            style={{ color: 'var(--text-2)' }}
          >
            <span>
              {t.presence.offline} <span className="tnum">({all.offline.length})</span>
            </span>
            <Chevron open={open} />
          </button>
        )}

        {open && (
          <ul>
            {found.offline.map((m) => (
              <PersonRow key={m.user_id} m={m} url={avatarFor(m.user_id)} locale={locale} compact />
            ))}
          </ul>
        )}
        {open && found.online.length + found.offline.length === 0 && <NoMatch />}
      </div>
    </div>
  )
}

function GroupLabel({ label, n }: { label: string; n: number }) {
  return (
    <p className="px-2 pb-1 pt-3 text-xs font-semibold" style={{ color: 'var(--text-2)' }}>
      {label} <span className="tnum">({n})</span>
    </p>
  )
}

function NoMatch() {
  const { t } = useI18n()
  return <p className="px-2 py-2 text-xs" style={{ color: 'var(--text-3)' }}>{t.presence.noMatch}</p>
}

export function PersonRow({
  m, url, locale, size = 32, isMe = false, compact = false,
}: {
  m: MemberPresence; url: string | null; locale: 'en' | 'ms'; size?: number; isMe?: boolean
  /** Beside the feed the column is narrow: the green dot alone says "online". */
  compact?: boolean
}) {
  const { t } = useI18n()
  const status = m.is_online
    ? (compact ? '' : t.presence.activeNow)
    : activeShort(m, locale) || (compact ? '' : t.presence.never)
  return (
    <li>
      <Link
        to={`/u/${m.user_id}`}
        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-[color:var(--surface-2)]"
      >
        <Avatar name={m.full_name} url={url} size={size} online={m.is_online} />
        <span className="flex min-w-0 flex-1 items-baseline gap-1 text-sm" style={{ color: m.is_online ? 'var(--text)' : 'var(--text-2)' }}>
          <span className="truncate">{m.full_name ?? '—'}</span>
          {/* outside the truncated span, so a long name cannot push it off */}
          {isMe && <span className="shrink-0 font-semibold">({t.presence.you})</span>}
        </span>
        {m.is_staff && <span className="chip tint-info">{t.presence.rps}</span>}
        {status && (
          <span
            className="tnum shrink-0 text-[11px] font-semibold"
            style={{ color: m.is_online ? 'var(--tint-good-ink)' : 'var(--text-3)' }}
          >
            {status}
          </span>
        )}
      </Link>
    </li>
  )
}
