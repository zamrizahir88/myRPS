import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ALLOWED_DOMAIN, supabase } from '../lib/supabase'
import { useI18n } from '../i18n'
import { Alert, Field } from '../components/ui'
import AuthShell from '../components/AuthShell'

export default function Register() {
  const { t, f } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const address = email.trim().toLowerCase()
    // Checked again server-side by handle_new_user(); this is only for a
    // friendlier message than a 500 from the trigger.
    if (ALLOWED_DOMAIN && !address.endsWith(`@${ALLOWED_DOMAIN}`)) {
      setError(f(t.auth.domainError, { domain: ALLOWED_DOMAIN }))
      return
    }
    if (password.length < 8) { setError(t.auth.weak); return }
    if (password !== confirm) { setError(t.auth.mismatch); return }

    setBusy(true)
    const { error } = await supabase.auth.signUp({ email: address, password })
    setBusy(false)
    if (error) setError(error.message)
    else setDone(true)
  }

  if (done) {
    return (
      <AuthShell title={t.auth.signUp}>
        <Alert tone="good">{t.auth.checkEmail}</Alert>
        <Link to="/login" className="btn-ghost mt-4 w-full">{t.auth.signIn}</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={t.auth.signUp}>
      <form onSubmit={onSubmit} className="space-y-3">
        {error && <Alert tone="critical">{error}</Alert>}

        <Field label={t.auth.email} hint={t.auth.domainHint}>
          <input
            className="input" type="email" autoComplete="email" required
            placeholder={`s221371666@${ALLOWED_DOMAIN}`}
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label={t.auth.password}>
          <input
            className="input" type="password" autoComplete="new-password" required minLength={8}
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label={t.auth.confirmPassword}>
          <input
            className="input" type="password" autoComplete="new-password" required
            value={confirm} onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? t.common.loading : t.auth.signUp}
        </button>

        <p className="pt-1 text-center text-xs text-ink-secondary">
          {t.auth.haveAccount}{' '}
          <Link to="/login" className="font-medium text-series-1 hover:underline">{t.auth.signIn}</Link>
        </p>
      </form>
    </AuthShell>
  )
}
