import { useEffect, useMemo, useState } from 'react'
import { fetchOnlineUsers, sendPresenceHeartbeat } from '../services/apiData'
import type { AppUser } from '../types'

const HEARTBEAT_MS = 25000
const FETCH_MS = 15000

export function useOnlineUsers(organizationId?: string) {
  const [users, setUsers] = useState<AppUser[]>([])

  useEffect(() => {
    if (!organizationId) return
    let cancelled = false

    async function heartbeat() {
      try {
        await sendPresenceHeartbeat()
      } catch (e) {
        console.error(e)
      }
    }

    async function loadOnline() {
      try {
        const data = await fetchOnlineUsers()
        if (!cancelled) setUsers(data)
      } catch (e) {
        console.error(e)
      }
    }

    void heartbeat()
    void loadOnline()

    const hbId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void heartbeat()
      }
    }, HEARTBEAT_MS)

    const onlineId = window.setInterval(() => void loadOnline(), FETCH_MS)
    const onFocus = () => {
      void heartbeat()
      void loadOnline()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      cancelled = true
      window.clearInterval(hbId)
      window.clearInterval(onlineId)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [organizationId])

  return useMemo(() => users, [users])
}
