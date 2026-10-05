import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePresence } from '../context/PresenceContext'
import { useI18n } from '../i18n'
import { useAvatarUrls } from '../hooks/useAvatarUrls'
import { PersonRow } from '../components/Cohort'
import { SkeletonList } from '../components/Skeleton'
import EmptyState, { EmptyIcons } from '../components/EmptyState'

/** Everyone in the cohort, who is here now, and when the rest last were. */
export default function People() {
  const { t, f, locale } = useI18n()
  const { profile } = useAuth()
  const { members, ready } = usePresence()
  const [query, setQuery] = useState('')

  const avatars = useAvatarUrls(members.map((m) => m.avatar_path))
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? members.filter((m) => (m.full_name ?? '').toLowerCase().includes(q)) : members
  }, [members, query])

  const online = members.filter((m) => m.is_online).length

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link to="/feed" className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>
        ← {t.nav.feed}
      </Link>

      <div>
        <h1 className="h-page">{t.presence.title}</h1>
        {ready && (
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-2)' }}>
            {f(t.presence.peopleSubtitle, { online, total: members.length })}
          </p>
        )}
      </div>

      {!ready ? (
        <SkeletonList count={4} />
      ) : (
        <>
          <input
            className="input" type="search" placeholder={t.presence.search}
            value={query} onChange={(e) => setQuery(e.target.value)}
          />

          {shown.length === 0 ? (
            <EmptyState icon={EmptyIcons.people} title={t.presence.noMatch} body="" />
          ) : (
            <ul className="card px-2 py-2">
              {shown.map((m) => (
                <PersonRow
                  key={m.user_id} m={m} locale={locale} size={40}
                  isMe={m.user_id === profile?.id}
                  url={m.avatar_path ? avatars.get(m.avatar_path) ?? null : null}
                />
              ))}
            </ul>
          )}

          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
            {t.presence.visibleNote}
          </p>
        </>
      )}
    </div>
  )
}
