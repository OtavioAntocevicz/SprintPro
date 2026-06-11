import type { Task } from '../types'

export type TaskSortOption = 'default' | 'title-asc' | 'title-desc' | 'due-asc' | 'due-desc' | 'priority-desc'
export type TaskDueFilter = 'all' | 'with-due' | 'no-due' | 'overdue' | 'next-7-days'
export type TaskPriorityFilter = 'all' | 'low' | 'medium' | 'high'

export type TaskFilters = {
  query: string
  assigneeId: string
  sort: TaskSortOption
  due: TaskDueFilter
  priority: TaskPriorityFilter
}

export const defaultTaskFilters: TaskFilters = {
  query: '',
  assigneeId: '',
  sort: 'default',
  due: 'all',
  priority: 'all',
}

const priorityRank: Record<string, number> = { high: 3, medium: 2, low: 1 }

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function parseDueDate(task: Task) {
  if (!task.dueDate) return null
  const d = new Date(`${task.dueDate}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function matchesDueFilter(task: Task, due: TaskDueFilter) {
  const date = parseDueDate(task)
  if (due === 'all') return true
  if (due === 'with-due') return date !== null
  if (due === 'no-due') return date === null
  if (!date) return false
  const today = startOfToday()
  if (due === 'overdue') return date < today
  if (due === 'next-7-days') {
    const limit = new Date(today)
    limit.setDate(limit.getDate() + 7)
    return date >= today && date <= limit
  }
  return true
}

function sortTasks(tasks: Task[], sort: TaskSortOption) {
  const list = [...tasks]
  switch (sort) {
    case 'title-asc':
      return list.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
    case 'title-desc':
      return list.sort((a, b) => b.title.localeCompare(a.title, 'pt-BR'))
    case 'due-asc':
      return list.sort((a, b) => {
        const da = parseDueDate(a)?.getTime() ?? Number.POSITIVE_INFINITY
        const db = parseDueDate(b)?.getTime() ?? Number.POSITIVE_INFINITY
        return da - db
      })
    case 'due-desc':
      return list.sort((a, b) => {
        const da = parseDueDate(a)?.getTime() ?? Number.NEGATIVE_INFINITY
        const db = parseDueDate(b)?.getTime() ?? Number.NEGATIVE_INFINITY
        return db - da
      })
    case 'priority-desc':
      return list.sort(
        (a, b) => (priorityRank[b.priority ?? ''] ?? 0) - (priorityRank[a.priority ?? ''] ?? 0),
      )
    default:
      return list
  }
}

export function filterTasks(tasks: Task[], filters: TaskFilters) {
  const q = filters.query.trim().toLowerCase()
  let result = tasks.filter((task) => {
    if (q) {
      const inTitle = task.title.toLowerCase().includes(q)
      const inDescription = task.description?.toLowerCase().includes(q)
      if (!inTitle && !inDescription) return false
    }
    if (filters.assigneeId === 'unassigned') {
      if (task.assignedTo || task.assigneeName) return false
    } else if (filters.assigneeId && task.assignedTo !== filters.assigneeId) {
      return false
    }
    if (filters.priority !== 'all' && task.priority !== filters.priority) return false
    if (!matchesDueFilter(task, filters.due)) return false
    return true
  })
  result = sortTasks(result, filters.sort)
  return result
}

export function hasActiveFilters(filters: TaskFilters) {
  return (
    filters.query.trim() !== '' ||
    filters.assigneeId !== '' ||
    filters.sort !== 'default' ||
    filters.due !== 'all' ||
    filters.priority !== 'all'
  )
}
