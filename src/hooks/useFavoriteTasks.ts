import { useEffect, useMemo, useState } from 'react'
import { fetchOrganizationTasks } from '../services/apiData'
import type { Task } from '../types'

const POLL_MS = 10000

export function useFavoriteTasks(organizationId?: string) {
  const [tasks, setTasks] = useState<Task[]>([])

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
    const id = window.setInterval(() => void load(), POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [organizationId])

  return useMemo(() => tasks.filter((t) => t.favorite), [tasks])
}
