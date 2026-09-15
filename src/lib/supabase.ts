import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Fail loudly at boot rather than with a confusing 401 on the first query.
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.',
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
