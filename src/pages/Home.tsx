import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Dashboard from './Dashboard'

/**
 * The RPS and a student want completely different first screens. The RPS has
 * no credits to track and no psychometric test to sit; their landing page is
 * their advisees.
 */
export default function Home() {
  const { isAdmin } = useAuth()
  return isAdmin ? <Navigate to="/admin" replace /> : <Dashboard />
}
