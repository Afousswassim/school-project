import { Navigate, Outlet } from 'react-router-dom'
import { PageState } from '../components/WorkspaceUI'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { authChecking, isAuthenticated } = useAuth()
  if (authChecking) {
    return <PageState loading>Checking your session…</PageState>
  }
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
