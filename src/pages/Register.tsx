import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ALLOWED_DOMAIN, supabase } from '../lib/supabase'
import { useI18n } from '../i18n'
import { describeAuthError } from '../lib/authErrors'
import { Alert, Field } from '../components/ui'
import PasswordField from '../components/PasswordField'
import AuthShell from '../components/AuthShell'

const MIN_PASSWORD = 8

export default function Register() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const longEnough = password.length >= MIN_PASSWORD
  const matches = confirm.length > 0 && password === confirm

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    // No domain check here — the database decides, and it knows about the
    // RPS's own address. See the note in handle_new_user().
    if (!longEnough) { setError(t.auth.weak); return }
    if (password !== confirm) { setError(t.auth.mismatch); return }

    setBusy(true)
    const { error: err } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(), password,
    })
    setBusy(false)
    if (err) { setError(describeAuthError(err.message, t).message); return }
    setDone(true)
  }

  if (done) {
    return (
      <AuthShell title={t.auth.signUp}>
        <Alert tone="good">{t.auth.checkEmail}</Alert>
        <ol className="mt-4 space-y-2.5 text-sm" style={{ color: 'var(--text-2)' }}>
          {[t.auth.step1, t.auth.step2, t.auth.step3].map((step, i) => (
            <li key={step} className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ backgroundColor: 'var(--brand-solid)' }}>
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <Link to="/login" className="btn-ghost mt-5 w-full">{t.auth.signIn}</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={t.auth.signUp}>
      <form onSubmit={onSubmit} className="space-y-3.5">
        {error && <Alert tone="critical">{error}</Alert>}

        <Alert tone="info">{t.auth.approvalNotice}</Alert>

        <Field label={t.auth.email} hint={t.auth.domainHint}>
          <input
            className="input" type="email" autoComplete="email" required autoFocus
            inputMode="email"
            placeholder={`s221371666@${ALLOWED_DOMAIN.split(',')[0]}`}
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label={t.auth.password}>
          <PasswordField
            value={password} onChange={setPassword}
            autoComplete="new-password" minLength={MIN_PASSWORD}
          />
          {/* the rule up front, not after a rejected submit */}
          <ul className="mt-2 space-y-1 text-xs">
            <Rule ok={longEnough} label={t.auth.rule8} />
            <Rule ok={matches} label={t.auth.ruleMatch} />
          </ul>
        </Field>

        <Field label={t.auth.confirmPassword}>
          <PasswordField value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </Field>

        <button className="btn-primary w-full" disabled={busy || !longEnough || !matches}>
          {busy ? t.common.loading : t.auth.signUp}
        </button>

        <p className="pt-0.5 text-center text-xs" style={{ color: 'var(--text-2)' }}>
          {t.auth.haveAccount}{' '}
          <Link to="/login" className="font-bold" style={{ color: 'var(--brand)' }}>{t.auth.signIn}</Link>
        </p>
      </form>
    </AuthShell>
  )
}

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-1.5" style={{ color: ok ? 'var(--tint-good-ink)' : 'var(--text-3)' }}>
      <span aria-hidden>{ok ? '✓' : '○'}</span>
      {label}
    </li>
  )
}
