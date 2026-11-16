import { Navigate } from 'react-router-dom'
import { getToken } from '../lib/apiClient'
import { useAuthStore } from '../store/authStore'

export function AuthHomeRedirect({ to = '/dashboard' }: { to?: string }) {
  const { appUser, loading } = useAuthStore()
  const hasSession = Boolean(getToken())

  if (loading) return null
  if (hasSession && appUser) {
    return <Navigate to={to} replace />
  }
  return null
}
