import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type { MemberPresence } from '../lib/types'

interface PresenceValue {
  /** Everyone approved, online first, then most recently active. */
  members: MemberPresence[]
  byId: Map<string, MemberPresence>
  isOnline: (userId: string | null | undefined) => boolean
  /** False until the database has 17_presence.sql; the UI then shows nothing. */
  ready: boolean
}

const EMPTY: PresenceValue = { members: [], byId: new Map(), isOnline: () => false, ready: false }

// A default rather than a throw: the avatar dot is decoration, and a component
// rendered outside the signed-in shell should simply show nobody online.
const PresenceContext = createContext<PresenceValue>(EMPTY)

// The database counts someone online for three minutes after a heartbeat, so
// one a minute survives a missed beat.
const BEAT_MS = 60_000

function sortMembers(rows: MemberPresence[]): MemberPresence[] {
  return [...rows].sort((a, b) => {
    if (a.is_online !== b.is_online) return a.is_online ? -1 : 1
    const at = a.last_active_at ? Date.parse(a.last_active_at) : 0
    const bt = b.last_active_at ? Date.parse(b.last_active_at) : 0
    if (at !== bt) return bt - at
    return (a.full_name ?? '').localeCompare(b.full_name ?? '')
  })
}

/**
 * Says "I am here" once a minute while the app is on screen, and reads back
 * who else is. A hidden tab stops beating, so leaving the app open in the
 * background is not the same as being online.
 */
export function PresenceProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const [members, setMembers] = useState<MemberPresence[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!userId) {
      setMembers([])
      setReady(false)
      return
    }
    let active = true

    const beat = async () => {
      if (document.visibilityState !== 'visible') return
      await supabase.rpc('touch_activity')
      const { data, error } = await supabase.from('member_presence').select('*')
      if (!active) return
      // An error here means the migration has not been run yet. Everything
      // else in the app works without it, so stay quiet.
      if (error || !data) { setReady(false); return }
      setMembers(sortMembers(data as MemberPresence[]))
      setReady(true)
    }

    void beat()
    const timer = window.setInterval(() => void beat(), BEAT_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') void beat() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId])

  const value = useMemo<PresenceValue>(() => {
    const byId = new Map(members.map((m) => [m.user_id, m]))
    return {
      members,
      byId,
      isOnline: (id) => (id ? byId.get(id)?.is_online === true : false),
      ready,
    }
  }, [members, ready])

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
}

export function usePresence(): PresenceValue {
  return useContext(PresenceContext)
}
