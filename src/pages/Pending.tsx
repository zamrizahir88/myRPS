import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import { Alert, Spinner } from '../components/ui'
import AuthShell from '../components/AuthShell'

export default function Pending() {
  const { t } = useI18n()
  const { session, profile, loading, signOut } = useAuth()

  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (profile?.approval_state === 'approved') return <Navigate to="/" replace />

  const rejected = profile?.approval_state === 'rejected'

  return (
    <AuthShell title={rejected ? t.pending.rejected : t.pending.title}>
      {rejected ? (
        <Alert tone="critical">
          {t.pending.rejected}
          {profile?.rejection_reason && (
            <div className="mt-1">
              <strong>{t.pending.reason}:</strong> {profile.rejection_reason}
            </div>
          )}
        </Alert>
      ) : (
        <Alert tone="info">{t.pending.body}</Alert>
      )}
      <button onClick={signOut} className="btn-ghost mt-4 w-full">{t.nav.signOut}</button>
    </AuthShell>
  )
}
