import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { Spinner } from './ui'

/** Signed in, approved, and past the consent screen. */
export function RequireStudent({ children }: { children: ReactNode }) {
  const { session, profile, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!profile) return <Spinner />
  if (profile.approval_state !== 'approved') return <Navigate to="/pending" replace />
  if (!profile.consent_at && !isAdmin) return <Navigate to="/consent" replace />
  return <>{children}</>
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, isAdmin, loading } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}
