import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import { useAvatarUrls } from '../hooks/useAvatarUrls'
import { Avatar } from './ui'

interface RpsInfo {
  user_id: string
  full_name: string | null
  title: string | null
  position_title: string | null
  department: string | null
  office_location: string | null
  whatsapp: string | null
  cv_url: string | null
  bio: string | null
  email_official: string | null
  avatar_path: string | null
}

/** How a student actually reaches their advisor. */
export default function RpsCard({ compact = false }: { compact?: boolean }) {
  const { t, f } = useI18n()
  const { profile } = useAuth()
  const [rps, setRps] = useState<RpsInfo | null>(null)

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('rps_card').select('*').limit(1).maybeSingle()
      setRps((data as RpsInfo) ?? null)
    })()
  }, [])

  const avatars = useAvatarUrls([rps?.avatar_path])
  if (!rps) return null

  const url = rps.avatar_path ? avatars.get(rps.avatar_path) ?? null : null
  const displayName = [rps.title, rps.full_name].filter(Boolean).join(' ')
  const waText = encodeURIComponent(
    f(t.dash.whatsappMessage, {
      name: profile?.full_name ?? '', matric: profile?.matric_no ?? '',
    }),
  )

  return (
    <div className="card">
      <h2 className="section-title mb-3">{t.rps.title}</h2>

      <div className="flex gap-3">
        <Avatar name={rps.full_name} url={url} size={compact ? 48 : 60} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-extrabold leading-tight">{displayName}</p>
          {rps.position_title && (
            <p className="text-xs font-medium" style={{ color: 'var(--brand)' }}>{rps.position_title}</p>
          )}
          {rps.department && (
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-3)' }}>{rps.department}</p>
          )}
        </div>
      </div>

      {rps.bio && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          {rps.bio}
        </p>
      )}

      <dl className="mt-3 space-y-1.5 text-xs">
        {rps.office_location && (
          <div className="flex gap-2">
            <dt style={{ color: 'var(--text-3)' }}>{t.rps.office}</dt>
            <dd className="font-medium">{rps.office_location}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt style={{ color: 'var(--text-3)' }}>{t.rps.availability}</dt>
          {/* No office hours by choice — the RPS is reachable any time */}
          <dd className="font-medium" style={{ color: 'var(--tint-good-ink)' }}>{t.rps.always}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {rps.whatsapp && (
          <a
            href={`https://wa.me/${rps.whatsapp.replace(/\D/g, '')}?text=${waText}`}
            target="_blank" rel="noreferrer"
            className="btn-primary flex-1 bg-[#1baf7a] px-3 py-2 text-xs hover:bg-[#199e70]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.4-1-2.6 0-1.2.6-1.8.9-2 .2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.1.1.3 0 .5l-.3.4-.3.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2 1.3 2.3 1.4.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.5.3 0 .1 0 .7-.3 1.3Z" />
            </svg>
            {t.rps.whatsapp}
          </a>
        )}
        {rps.email_official && (
          <a href={`mailto:${rps.email_official}`} className="btn-ghost px-3 py-2 text-xs">
            {t.rps.email}
          </a>
        )}
        {rps.cv_url && (
          <a href={rps.cv_url} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-xs">
            {t.rps.cv}
          </a>
        )}
      </div>
    </div>
  )
}
