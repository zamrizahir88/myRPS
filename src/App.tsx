import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { RequireAdmin, RequireStudent } from './components/Guards'
import Login from './pages/Login'
import Register from './pages/Register'
import Pending from './pages/Pending'
import Consent from './pages/Consent'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import ProfilePage from './pages/Profile'
import Academic from './pages/Academic'
import Psychometric from './pages/Psychometric'
import Pillars from './pages/Pillars'
import Feed from './pages/Feed'
import AdminLayout from './pages/admin/AdminLayout'
import Applications from './pages/admin/Applications'
import StudentList from './pages/admin/StudentList'
import StudentDetail from './pages/admin/StudentDetail'
import Curriculum from './pages/admin/Curriculum'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pending" element={<Pending />} />
      <Route path="/consent" element={<Consent />} />

      <Route element={<RequireStudent><Layout /></RequireStudent>}>
        <Route index element={<Home />} />
        <Route path="my-dashboard" element={<Dashboard />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="academic" element={<Academic />} />
        <Route path="psychometric" element={<Psychometric />} />
        <Route path="pillars" element={<Pillars />} />
        <Route path="feed" element={<Feed />} />
        <Route path="community" element={<Navigate to="/feed" replace />} />

        <Route path="admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<StudentList />} />
          <Route path="applications" element={<Applications />} />
          <Route path="student/:id" element={<StudentDetail />} />
          <Route path="curriculum" element={<Curriculum />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
