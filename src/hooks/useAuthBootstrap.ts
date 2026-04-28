import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'

export function useAuthBootstrap() {
  const bootstrap = useAuthStore((state) => state.bootstrap)
  const clearSession = useAuthStore((state) => state.clearSession)

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  useEffect(() => {
    const onExpired = () => {
      clearSession()
    }
    window.addEventListener('sprintpro:session-expired', onExpired)
    return () => window.removeEventListener('sprintpro:session-expired', onExpired)
  }, [clearSession])
}
