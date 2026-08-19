import { Navigate } from 'react-router-dom'
import { getToken } from '../lib/apiClient'
import { useAuthStore } from '../store/authStore'

export function AuthHomeRedirect() {
  const { appUser, loading } = useAuthStore()
  const hasSession = Boolean(getToken())

  if (loading) return null
  if (hasSession && appUser) {
    return <Navigate to="/dashboard" replace />
  }
  return null
}
