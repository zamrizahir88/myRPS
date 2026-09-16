import type { Dict } from '../i18n/en'

export type AuthProblem =
  | { kind: 'unconfirmed'; message: string }
  | { kind: 'other'; message: string }

/**
 * Supabase returns terse English regardless of the chosen language, and
 * "Email not confirmed" in particular tells a student nothing about what to
 * do. Translate the ones people actually hit, and flag the unconfirmed case
 * so the form can offer to resend.
 */
export function describeAuthError(raw: string, t: Dict): AuthProblem {
  const m = raw.toLowerCase()

  if (m.includes('email not confirmed') || m.includes('not confirmed')) {
    return { kind: 'unconfirmed', message: t.auth.errUnconfirmed }
  }
  if (m.includes('invalid login credentials') || m.includes('invalid_credentials')) {
    return { kind: 'other', message: t.auth.errWrongCredentials }
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return { kind: 'other', message: t.auth.errAlreadyRegistered }
  }
  if (m.includes('rate limit') || m.includes('too many') || m.includes('for security purposes')) {
    return { kind: 'other', message: t.auth.errTooMany }
  }
  if (m.includes('database error') || m.includes('unexpected_failure')) {
    return { kind: 'other', message: t.auth.domainError }
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return { kind: 'other', message: t.auth.errNetwork }
  }
  return { kind: 'other', message: raw }
}
