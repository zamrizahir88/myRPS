import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import { Avatar } from './ui'

/**
 * The welcome line at the top of a landing page. Deliberately large — the
 * person's own name in 11px grey at the edge of a toolbar does not welcome
 * anyone.
 */
export default function Greeting({ subtitle }: { subtitle?: string }) {
  const { t, locale } = useI18n()
  const { profile, showAdminUi } = useAuth()
  const name = profile?.full_name?.trim()

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <Avatar name={name ?? null} size={52} />
      <div className="min-w-0">
        <h1 className="font-display text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">
          {locale === 'ms' ? 'Helo' : 'Hello'},{' '}
          <span style={{ color: 'var(--brand)' }}>{name || (locale === 'ms' ? 'rakan' : 'there')}</span>!
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--text-2)' }}>
          {subtitle ?? (showAdminUi ? t.nav.roleRpsFull : t.app.tagline)}
        </p>
      </div>
    </div>
  )
}
