import { useState } from 'react'
import { useI18n } from '../i18n'

/**
 * A password input that can be read. Typing blind on a phone keyboard is the
 * most common reason a correct password gets rejected, and Caps Lock is the
 * second.
 */
export default function PasswordField({
  value, onChange, autoComplete = 'current-password', minLength, id,
}: {
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  minLength?: number
  id?: string
}) {
  const { t } = useI18n()
  const [visible, setVisible] = useState(false)
  const [capsLock, setCapsLock] = useState(false)

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          className="input pr-11"
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyUp={(e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false)}
          onBlur={() => setCapsLock(false)}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl"
          style={{ color: 'var(--text-3)' }}
          aria-label={visible ? t.auth.hidePassword : t.auth.showPassword}
          title={visible ? t.auth.hidePassword : t.auth.showPassword}
        >
          {visible ? <EyeOff /> : <Eye />}
        </button>
      </div>
      {capsLock && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold"
           style={{ color: 'var(--tint-warn-ink)' }}>
          ⇪ {t.auth.capsLock}
        </p>
      )}
    </div>
  )
}

const s = {
  width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
}
const Eye = () => <svg {...s}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
const EyeOff = () => <svg {...s}><path d="M3 3l18 18M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2M6.7 6.8C4 8.4 2 12 2 12s3.6 7 10 7a10 10 0 0 0 4.3-.9M17.9 17A13 13 0 0 0 22 12s-3.6-7-10-7a10 10 0 0 0-2 .2" /></svg>
