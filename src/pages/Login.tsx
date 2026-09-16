import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { RPS_EMAIL, supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import { describeAuthError } from '../lib/authErrors'
import { Alert, Field } from '../components/ui'
import PasswordField from '../components/PasswordField'
import AuthShell from '../components/AuthShell'

export default function Login() {
  const { t } = useI18n()
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsConfirm, setNeedsConfirm] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  if (!loading && session) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNeedsConfirm(false)
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(), password,
    })
    setBusy(false)
    if (!err) { navigate('/'); return }
    const problem = describeAuthError(err.message, t)
    setError(problem.message)
    setNeedsConfirm(problem.kind === 'unconfirmed')
  }

  async function resendConfirmation() {
    setBusy(true)
    await supabase.auth.resend({ type: 'signup', email: email.trim() })
    setBusy(false)
    setNeedsConfirm(false)
    setError(null)
    setNotice(t.auth.confirmResent)
  }

  async function onReset() {
    if (!email.trim()) { setError(t.auth.enterEmailFirst); return }
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}${window.location.pathname}#/login`,
    })
    setNotice(t.auth.resetSent)
  }

  return (
    <AuthShell title={t.auth.signIn}>
      <form onSubmit={onSubmit} className="space-y-3.5">
        {error && (
          <Alert tone="critical">
            {error}
            {needsConfirm && (
              <button
                type="button"
                onClick={() => void resendConfirmation()}
                disabled={busy}
                className="mt-2 block font-bold underline underline-offset-2"
              >
                {t.auth.resendConfirmation}
              </button>
            )}
          </Alert>
        )}
        {notice && <Alert tone="good">{notice}</Alert>}

        <Field label={t.auth.email}>
          <input
            className="input" type="email" autoComplete="email" required autoFocus
            inputMode="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label={t.auth.password}>
          <PasswordField value={password} onChange={setPassword} />
        </Field>

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? t.common.loading : t.auth.signIn}
        </button>

        <div className="flex items-center justify-between pt-0.5 text-xs">
          <button type="button" onClick={() => void onReset()}
                  className="font-semibold" style={{ color: 'var(--brand)' }}>
            {t.auth.forgot}
          </button>
          <span style={{ color: 'var(--text-2)' }}>
            {t.auth.noAccount}{' '}
            <Link to="/register" className="font-bold" style={{ color: 'var(--brand)' }}>
              {t.auth.signUp}
            </Link>
          </span>
        </div>

        {RPS_EMAIL && (
          <p className="border-t pt-3 text-center text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}>
            {t.auth.trouble}{' '}
            <a href={`mailto:${RPS_EMAIL}?subject=myRPS`} className="font-semibold" style={{ color: 'var(--brand)' }}>
              {RPS_EMAIL}
            </a>
          </p>
        )}
      </form>
    </AuthShell>
  )
}
