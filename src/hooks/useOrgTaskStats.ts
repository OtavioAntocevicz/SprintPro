import { useEffect, useMemo, useState } from 'react'
import { fetchOrganizationTasks } from '../services/apiData'
import type { Task } from '../types'

const POLL_MS = 4000

export function useOrgTaskStats(organizationId?: string) {
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

  return useMemo(() => {
    const active = tasks.filter((task) => task.status !== 'done').length
    const upcoming = tasks.filter((task) => {
      if (!task.dueDate || task.status === 'done') return false
      const taskDate = new Date(task.dueDate)
      const now = new Date()
      const diffDays = (taskDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      return diffDays >= 0 && diffDays <= 7
    }).length

    return {
      totalActiveTasks: active,
      upcomingDeadlines: upcoming,
      totalTasks: tasks.length,
    }
  }, [tasks])
}
