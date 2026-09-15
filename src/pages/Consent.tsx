import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import { Alert, Spinner } from '../components/ui'
import AuthShell from '../components/AuthShell'

const CONSENT_VERSION = '2025-v1'

export default function Consent() {
  const { t } = useI18n()
  const { session, profile, loading, refreshProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (profile?.consent_at) return <Navigate to="/" replace />

  async function accept() {
    setBusy(true)
    await supabase
      .from('profiles')
      .update({ consent_version: CONSENT_VERSION, consent_at: new Date().toISOString() })
      .eq('id', session!.user.id)
    await refreshProfile()
    setBusy(false)
    navigate('/profile')
  }

  return (
    <AuthShell title={t.consent.title}>
      <div className="space-y-3 text-sm leading-relaxed text-ink-secondary">
        <p>{t.consent.body}</p>
        <Alert tone="warning">{t.consent.sensitive}</Alert>
        <p>{t.consent.retention}</p>
      </div>
      <button onClick={accept} disabled={busy} className="btn-primary mt-5 w-full">
        {t.consent.agree}
      </button>
      <button onClick={signOut} className="btn-ghost mt-2 w-full">{t.consent.decline}</button>
    </AuthShell>
  )
}
