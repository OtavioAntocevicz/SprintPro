import { useMemo } from 'react'
import { useOrganizationTasks } from './useOrganizationTasks'
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
  const { tasks, loading, error, refetch, memberCount } = useOrganizationTasks(organizationId)

  const stats = useMemo(() => {
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

  return { ...stats, loading, error, refetch }
}
