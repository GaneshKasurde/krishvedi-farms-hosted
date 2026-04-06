import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin && (window.location.pathname.startsWith('/admin'))) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}