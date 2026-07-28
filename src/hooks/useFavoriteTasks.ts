import { useEffect, useMemo, useState } from 'react'
import { fetchOrganizationTasks } from '../services/apiData'
import { useMembersCount } from './useMembersCount'
import { pollIntervalForMemberCount } from '../utils/pollInterval'
import type { Task } from '../types'

export function useFavoriteTasks(organizationId?: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const memberCount = useMembersCount(organizationId)
  const pollMs = pollIntervalForMemberCount(memberCount)

  useEffect(() => {
    if (!organizationId) return
    let cancelled = false
    async function load() {
      try {
        const data = await fetchOrganizationTasks()
        if (!cancelled) setTasks(data)
      } catch (e) {
        console.error(e)
      }
    }
    void load()
    const id = window.setInterval(() => void load(), pollMs)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [organizationId, pollMs])

  return useMemo(() => tasks.filter((t) => t.favorite), [tasks])
}
