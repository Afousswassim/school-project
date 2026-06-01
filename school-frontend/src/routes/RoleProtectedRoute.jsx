import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { canAccessRole, homeForRole } from '../auth/roles'
import { useAuth } from '../context/AuthContext'

export default function RoleProtectedRoute({ roles }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!canAccessRole(user, roles)) {
    return <Navigate to={homeForRole(user?.role)} replace />
  }

  return <Outlet />
}
