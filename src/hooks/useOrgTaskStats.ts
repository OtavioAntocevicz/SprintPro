import { useEffect, useMemo, useState } from 'react'
import { fetchOrganizationTasks } from '../services/apiData'
import { useMembersCount } from './useMembersCount'
import { pollIntervalForMemberCount } from '../utils/pollInterval'
import type { Task } from '../types'

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function parseDue(task: Task) {
  if (!task.dueDate) return null
  const d = new Date(`${task.dueDate}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function useOrgTaskStats(organizationId?: string) {
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

  return useMemo(() => {
    const today = startOfToday()
    const inSevenDays = new Date(today)
    inSevenDays.setDate(inSevenDays.getDate() + 7)

    const active = tasks.filter((task) => task.status !== 'done')
    const overdueTasks = active
      .filter((task) => {
        const d = parseDue(task)
        return d !== null && d < today
      })
      .sort((a, b) => (parseDue(a)?.getTime() ?? 0) - (parseDue(b)?.getTime() ?? 0))

    const upcomingTasks = active
      .filter((task) => {
        const d = parseDue(task)
        return d !== null && d >= today && d <= inSevenDays
      })
      .sort((a, b) => (parseDue(a)?.getTime() ?? 0) - (parseDue(b)?.getTime() ?? 0))

    return {
      totalActiveTasks: active.length,
      upcomingDeadlines: upcomingTasks.length,
      overdueCount: overdueTasks.length,
      upcomingTasks,
      overdueTasks,
      totalTasks: tasks.length,
      memberCount,
    }
  }, [tasks, memberCount])
}
