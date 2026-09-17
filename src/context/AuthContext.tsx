import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'

interface AuthValue {
  session: Session | null
  profile: Profile | null
  /** True when the account is an RPS admin. Unaffected by preview mode. */
  isAdmin: boolean
  /** True when an admin has switched into the student view to try it out. */
  previewAsStudent: boolean
  setPreviewAsStudent: (on: boolean) => void
  /** What the interface should show: false while an admin is previewing. */
  showAdminUi: boolean
  /** Signed URL for the signed-in user's own photo, if they have one. */
  avatarUrl: string | null
  /** True when a token refresh failed and the user has to sign in again. */
  sessionExpired: boolean
  clearSessionExpired: () => void
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

// sessionStorage, not localStorage: previewing the student side is a thing
// you do for a few minutes, not a setting. It also clears on every sign-in
// below, so signing in never drops the RPS into the student view.
const PREVIEW_KEY = 'myrps.previewAsStudent'

function sameProfile(a: Profile | null, b: Profile | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return JSON.stringify(a) === JSON.stringify(b)
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [previewAsStudent, setPreview] = useState(() => {
    try {
      return sessionStorage.getItem(PREVIEW_KEY) === '1'
    } catch {
      return false
    }
  })
  const [sessionExpired, setSessionExpired] = useState(false)

  const setPreviewAsStudent = useCallback((on: boolean) => {
    setPreview(on)
    try {
      sessionStorage.setItem(PREVIEW_KEY, on ? '1' : '0')
    } catch {
      // not fatal — the switch just won't survive a reload
    }
  }, [])

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null)
      setIsAdmin(false)
      return
    }
    const [{ data: prof }, { data: admin }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      // is_admin() is a security-definer function; the admins table itself is
      // not readable by students.
      supabase.rpc('is_admin'),
    ])
    const loaded = (prof as Profile) ?? null
    // Only replace the object when the row genuinely differs. Supabase emits
    // auth events routinely — token refresh ticks, tab focus — and each one
    // used to hand every consumer a brand new object with identical contents,
    // re-running their effects for no reason.
    setProfile((current) => (sameProfile(current, loaded) ? current : loaded))
    setIsAdmin(admin === true)

    // The bucket is private, so the photo needs a signed link.
    if (loaded?.avatar_path) {
      const { data: signed } = await supabase.storage
        .from('avatars').createSignedUrl(loaded.avatar_path, 3600)
      setAvatarUrl(signed?.signedUrl ?? null)
    } else {
      setAvatarUrl(null)
    }
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadProfile(data.session?.user.id)
      if (active) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, next) => {
      if (!active) return

      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        // Always start in the role you actually have.
        setPreview(false)
        try { sessionStorage.removeItem(PREVIEW_KEY) } catch { /* blocked storage */ }
      }

      // Supabase refreshes tokens on its own, so a session normally never
      // ends. It only lands here when the refresh genuinely failed — password
      // changed, signed out elsewhere, or the project was paused — and the
      // app would otherwise just stop working with no explanation.
      if (event === 'TOKEN_REFRESHED' && !next) setSessionExpired(true)
      if (event === 'SIGNED_OUT' && session) setSessionExpired(false)

      setSession(next)
      await loadProfile(next?.user.id)
      setLoading(false)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const value = useMemo<AuthValue>(
    () => ({
      session,
      profile,
      isAdmin,
      avatarUrl,
      sessionExpired,
      clearSessionExpired: () => setSessionExpired(false),
      previewAsStudent,
      setPreviewAsStudent,
      showAdminUi: isAdmin && !previewAsStudent,
      loading,
      refreshProfile: () => loadProfile(session?.user.id),
      signOut: async () => {
        await supabase.auth.signOut()
        setProfile(null)
        setIsAdmin(false)
        setAvatarUrl(null)
      },
    }),
    [session, profile, isAdmin, avatarUrl, sessionExpired, previewAsStudent, setPreviewAsStudent, loading, loadProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
