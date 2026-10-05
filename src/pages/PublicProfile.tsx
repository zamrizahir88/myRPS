import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useI18n } from '../i18n'
import { useAvatarUrls } from '../hooks/useAvatarUrls'
import { usePresence } from '../context/PresenceContext'
import { activeLabel } from '../lib/presence'
import { Avatar } from '../components/ui'
import RpsCard from '../components/RpsCard'
import { SkeletonCard } from '../components/Skeleton'
import EmptyState, { EmptyIcons } from '../components/EmptyState'
import { DEFINITIONS } from '../lib/intelligences'
import { PILLARS } from '../lib/pillars'
import type { IntelligenceKey } from '../lib/types'

interface PublicProfile {
  user_id: string
  full_name: string | null
  avatar_path: string | null
  bio: string | null
  study_year: number | null
  semester: number | null
  session: string | null
  persona: IntelligenceKey | null
  pillars_done: number | null
  member_since: string
}

/** What a classmate sees. Everything here is opt-in, field by field. */
export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { t, f, locale } = useI18n()
  const presence = usePresence()
  const [person, setPerson] = useState<PublicProfile | null>(null)
  const [isRps, setIsRps] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      // The RPS is not in public_profiles — that view is students only — so
      // their own name used to resolve to "this profile is private".
      const [{ data: student }, { data: staff }] = await Promise.all([
        supabase.from('public_profiles').select('*').eq('user_id', id).maybeSingle(),
        supabase.from('rps_card').select('user_id').eq('user_id', id).maybeSingle(),
      ])
      setPerson((student as PublicProfile) ?? null)
      setIsRps(!!staff)
      setLoading(false)
    })()
  }, [id])

  // Above the early returns: a hook that only runs once the profile has
  // loaded changes the hook count between renders, and React stops the page.
  const avatars = useAvatarUrls([person?.avatar_path])

  if (loading) return <SkeletonCard lines={4} />

  if (isRps) {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <Link to="/feed" className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>
          ← {t.nav.feed}
        </Link>
        <RpsCard />
      </div>
    )
  }

  if (!person) {
    return (
      <EmptyState
        icon={EmptyIcons.people}
        title={t.publicProfile.privateTitle}
        body={t.publicProfile.privateBody}
        actionLabel={t.nav.feed}
        actionTo="/feed"
      />
    )
  }

  const url = person.avatar_path ? avatars.get(person.avatar_path) ?? null : null
  const def = person.persona ? DEFINITIONS[person.persona] : null
  const here = presence.byId.get(person.user_id)

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link to="/feed" className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>
        ← {t.nav.feed}
      </Link>

      <div className="card text-center">
        <div className="flex justify-center">
          <Avatar name={person.full_name} url={url} size={88} online={here?.is_online ?? false} />
        </div>
        <h1 className="mt-3 font-display text-xl font-extrabold tracking-tight">
          {person.full_name ?? '—'}
        </h1>
        {here && (
          <p
            className="mt-1 text-xs font-semibold"
            style={{ color: here.is_online ? 'var(--tint-good-ink)' : 'var(--text-3)' }}
          >
            {activeLabel(here, t, f, locale)}
          </p>
        )}
        {person.study_year && (
          <p className="mt-1 text-sm" style={{ color: 'var(--text-2)' }}>
            {locale === 'ms' ? 'Tahun' : 'Year'} {person.study_year} ·{' '}
            {person.semester === 3
              ? (locale === 'ms' ? 'Semester Tambahan' : 'Special Semester')
              : `${locale === 'ms' ? 'Semester' : 'Semester'} ${person.semester}`}{' '}
            · {person.session}
          </p>
        )}
        {person.bio && (
          <p className="mx-auto mt-3 max-w-sm whitespace-pre-wrap text-sm leading-relaxed"
             style={{ color: 'var(--text-2)' }}>
            {person.bio}
          </p>
        )}
      </div>

      {def && (
        <div className="card" style={{ borderTop: `4px solid ${def.accent}` }}>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: def.accent }}>
            {t.psychometric.strength}
          </p>
          <h2 className="mt-1 font-display text-lg font-extrabold">
            {locale === 'ms' ? def.title_ms : def.title_en}
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            {locale === 'ms' ? def.name_ms : def.name_en}
          </p>
        </div>
      )}

      {person.pillars_done != null && (
        <div className="card">
          <h2 className="section-title mb-3">
            {t.pillars.title} · {person.pillars_done}/7
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {PILLARS.map((p, i) => (
              <span
                key={p.code}
                className={`chip ${i < (person.pillars_done ?? 0) ? 'tint-good' : 'tint-muted'}`}
              >
                P{i + 1}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px]" style={{ color: 'var(--text-3)' }}>
            {t.publicProfile.pillarsNote}
          </p>
        </div>
      )}
    </div>
  )
}
