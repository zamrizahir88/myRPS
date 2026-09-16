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
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const PREVIEW_KEY = 'myrps.previewAsStudent'

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [previewAsStudent, setPreview] = useState(() => {
    try {
      return localStorage.getItem(PREVIEW_KEY) === '1'
    } catch {
      return false
    }
  })

  const setPreviewAsStudent = useCallback((on: boolean) => {
    setPreview(on)
    try {
      localStorage.setItem(PREVIEW_KEY, on ? '1' : '0')
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
    setProfile(loaded)
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

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (!active) return
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
    [session, profile, isAdmin, avatarUrl, previewAsStudent, setPreviewAsStudent, loading, loadProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
