import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import { loginTime } from '../lib/presence'
import type { UserActivity } from '../lib/types'

/**
 * When you signed in, and the time before that. Private to the account: the
 * point is to notice a sign-in that was not yours.
 */
export default function LoginActivity() {
  const { t, locale } = useI18n()
  const { session } = useAuth()
  const userId = session?.user.id
  const [row, setRow] = useState<UserActivity | null>(null)

  useEffect(() => {
    if (!userId) return
    let active = true
    void (async () => {
      const { data } = await supabase.from('user_activity').select('*').eq('user_id', userId).maybeSingle()
      if (active) setRow((data as UserActivity) ?? null)
    })()
    return () => { active = false }
  }, [userId])

  // Nothing recorded yet: an account still on a sign-in from before this
  // existed. It fills in the next time they sign in.
  if (!row?.last_login_at) return null

  return (
    <section className="card">
      <h2 className="section-title mb-3">{t.presence.loginTitle}</h2>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs" style={{ color: 'var(--text-3)' }}>{t.presence.previousLogin}</dt>
          <dd className="tnum font-semibold">
            {row.prev_login_at ? loginTime(row.prev_login_at, locale) : t.presence.firstLogin}
          </dd>
        </div>
        <div>
          <dt className="text-xs" style={{ color: 'var(--text-3)' }}>{t.presence.thisLogin}</dt>
          <dd className="tnum font-semibold">{loginTime(row.last_login_at, locale)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
        {t.presence.loginHint}
      </p>
    </section>
  )
}
