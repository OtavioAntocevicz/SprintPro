import { useEffect, useMemo, useState } from 'react'
import { fetchOnlineUsers, sendPresenceHeartbeat } from '../services/apiData'
import { useMembersCount } from './useMembersCount'
import { presenceIntervalForMemberCount } from '../utils/pollInterval'
import type { AppUser } from '../types'

export function useOnlineUsers(organizationId?: string) {
  const [users, setUsers] = useState<AppUser[]>([])
  const memberCount = useMembersCount(organizationId)
  const { heartbeatMs, fetchMs } = presenceIntervalForMemberCount(memberCount)

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
    }, heartbeatMs)

    const onlineId = window.setInterval(() => void loadOnline(), fetchMs)
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
  }, [organizationId, heartbeatMs, fetchMs])

  return useMemo(() => users, [users])
}
