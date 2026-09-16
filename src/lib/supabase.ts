import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const rawUrl = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!rawUrl || !anonKey) {
  // Fail loudly at boot rather than with a confusing 401 on the first query.
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.',
  )
}

/**
 * The dashboard shows endpoint addresses like
 * https://xxxx.supabase.co/rest/v1/ alongside the project URL, and they are
 * easy to mix up. The client appends /rest/v1 itself, so pasting the longer
 * one produces /rest/v1/rest/v1/... and every query 404s with no hint as to
 * why. Trim it back to the origin instead of failing.
 */
function normaliseProjectUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '')
  try {
    return new URL(trimmed).origin
  } catch {
    throw new Error(
      `VITE_SUPABASE_URL is not a valid address: "${value}". ` +
        'It should look like https://yourproject.supabase.co',
    )
  }
}

const url = normaliseProjectUrl(rawUrl)

if (import.meta.env.DEV && url !== rawUrl.trim().replace(/\/+$/, '')) {
  console.warn(
    `[myRPS] Trimmed VITE_SUPABASE_URL to ${url} — the project URL has no path after the domain.`,
  )
}

/** True for a service_role JWT, whose payload names the role in clear text. */
function isServiceRoleJwt(key: string): boolean {
  const payload = key.split('.')[1]
  if (!payload) return false
  try {
    // base64url -> base64 before decoding; atob rejects - and _
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return /"role"\s*:\s*"service_role"/.test(decoded)
  } catch {
    return false
  }
}

if (anonKey.startsWith('sb_secret_') || isServiceRoleJwt(anonKey)) {
  // A secret key in the browser bundle would hand every visitor full database
  // access, bypassing every row-level policy. Refuse to start.
  throw new Error(
    'VITE_SUPABASE_ANON_KEY is a SECRET key. Never put a secret key in this app — ' +
      'it bypasses all security rules. Use the publishable key (sb_publishable_...) ' +
      'and revoke the leaked secret key in Supabase → Project Settings → API Keys.',
  )
}

// The anon key is public by design — it ships inside this bundle. Every access
// rule lives in the database (supabase/03_rls.sql), never here.
export const supabase = createClient<Database>(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})

// Cosmetic only — the real gate is the handle_new_user() trigger in the
// database. This just lets the signup form say so before the round trip.
export const ALLOWED_DOMAIN =
  import.meta.env.VITE_ALLOWED_DOMAIN ?? 'studentmail.unimap.edu.my'

export const RPS_WHATSAPP = import.meta.env.VITE_RPS_WHATSAPP ?? ''
export const RPS_NAME = import.meta.env.VITE_RPS_NAME ?? 'RPS'
