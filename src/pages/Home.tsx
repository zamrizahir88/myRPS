import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Feed from './Feed'

/**
 * Everyone lands on the feed. It is the one screen that changes between
 * visits, so it is the reason to open the app; the RPS's advisee list and the
 * student's own progress are both one tap away.
 */
export default function Home() {
  const { showAdminUi } = useAuth()
  return showAdminUi ? <Navigate to="/feed" replace /> : <Feed />
}
