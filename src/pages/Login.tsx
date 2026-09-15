import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import { Alert, Field } from '../components/ui'
import AuthShell from '../components/AuthShell'

export default function Login() {
  const { t } = useI18n()
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  if (!loading && session) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  async function onReset() {
    if (!email.trim()) {
      setError(t.auth.email)
      return
    }
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}${window.location.pathname}#/login`,
    })
    setNotice(t.auth.resetSent)
  }

  return (
    <AuthShell title={t.auth.signIn}>
      <form onSubmit={onSubmit} className="space-y-3">
        {error && <Alert tone="critical">{error}</Alert>}
        {notice && <Alert tone="good">{notice}</Alert>}

        <Field label={t.auth.email}>
          <input
            className="input" type="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label={t.auth.password}>
          <input
            className="input" type="password" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? t.common.loading : t.auth.signIn}
        </button>

        <div className="flex items-center justify-between pt-1 text-xs">
          <button type="button" onClick={onReset} className="text-series-1 hover:underline">
            {t.auth.forgot}
          </button>
          <span className="text-ink-secondary">
            {t.auth.noAccount}{' '}
            <Link to="/register" className="font-medium text-series-1 hover:underline">
              {t.auth.signUp}
            </Link>
          </span>
        </div>
      </form>
    </AuthShell>
  )
}
