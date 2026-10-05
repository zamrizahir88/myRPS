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

function OnlineCount({ n }: { n: number }) {
  const { t, f } = useI18n()
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--tint-good-ink)' }}>
      <span className="h-2 w-2 rounded-full" style={{ background: 'var(--status-good)' }} aria-hidden />
      <span className="tnum">{f(t.presence.onlineCount, { n })}</span>
    </span>
  )
}

/**
 * Phones: a row of faces you swipe sideways, above the composer. It is the
 * first thing on the screen because "who is here" is the reason to post.
 */
export function CohortStrip({ members, meId, avatarFor }: Props) {
  const { t, locale } = useI18n()
  const others = members.filter((m) => m.user_id !== meId)
  if (others.length === 0) return null
  const online = others.filter((m) => m.is_online).length
  // Online people, then enough recent ones that the row is never bare.
  const shown = others.filter((m) => m.is_online || m.last_active_at).slice(0, Math.max(online, 12))

  return (
    <section className="card px-0 py-3 lg:hidden" aria-label={t.presence.title}>
      <div className="flex items-center justify-between px-4">
        <OnlineCount n={online} />
        <Link to="/people" className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>
          {t.presence.seeAll} →
        </Link>
      </div>

      {shown.length === 0 ? (
        <p className="px-4 pt-2 text-xs" style={{ color: 'var(--text-3)' }}>{t.presence.nobodyElse}</p>
      ) : (
        <ul className="mt-2.5 flex gap-1 overflow-x-auto px-3 pb-1" style={{ scrollbarWidth: 'none' }}>
          {shown.map((m) => (
            <li key={m.user_id} className="shrink-0">
              <Link
                to={`/u/${m.user_id}`}
                className="flex w-[4.25rem] flex-col items-center gap-1 rounded-lg py-1 text-center"
              >
                <span style={{ opacity: m.is_online ? 1 : 0.55 }}>
                  <Avatar name={m.full_name} url={avatarFor(m.user_id)} size={48} online={m.is_online} />
                </span>
                <span className="w-full truncate text-[11px] font-semibold leading-tight">
                  {firstName(m.full_name)}
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
      )}
    </section>
  )
}

/** Wider screens: a contact list beside the feed. */
export function CohortCard({ members, meId, avatarFor }: Props) {
  const { t, locale } = useI18n()
  const others = members.filter((m) => m.user_id !== meId)
  if (others.length === 0) return null
  const online = others.filter((m) => m.is_online).length
  const shown = others.slice(0, Math.max(online, 8)).slice(0, 12)

  return (
    <div className="card hidden lg:block">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="section-title">{t.presence.title}</h2>
        <OnlineCount n={online} />
      </div>

      {online === 0 && (
        <p className="mb-2 text-xs" style={{ color: 'var(--text-3)' }}>{t.presence.nobodyElse}</p>
      )}

      <ul className="-mx-2">
        {shown.map((m) => <PersonRow key={m.user_id} m={m} url={avatarFor(m.user_id)} locale={locale} compact />)}
      </ul>

      <Link
        to="/people"
        className="mt-2 block rounded-lg py-1.5 text-center text-xs font-semibold tint-muted"
      >
        {t.presence.seeAll} <span className="tnum">({others.length})</span>
      </Link>
    </div>
  )
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
        <span className="min-w-0 flex-1 truncate text-sm" style={{ color: m.is_online ? 'var(--text)' : 'var(--text-2)' }}>
          {m.full_name ?? '—'}
        </span>
        {isMe && <span className="chip tint-muted">{t.presence.you}</span>}
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
