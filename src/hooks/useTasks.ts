import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchBoardTasks } from '../services/apiData'
import { useMembersCount } from './useMembersCount'
import { pollIntervalForMemberCount } from '../utils/pollInterval'
import { taskPhase } from '../utils/taskStatus'
import type { Task } from '../types'

export type TaskLocalPatch = Partial<
  Pick<
    Task,
    | 'status'
    | 'favorite'
    | 'notesCount'
    | 'title'
    | 'description'
    | 'label'
    | 'priority'
    | 'dueDate'
    | 'assigneeName'
    | 'assignedTo'
    | 'completedAt'
  >
>

export function useTasks(organizationId?: string, boardId?: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const memberCount = useMembersCount(organizationId)
  const pollMs = pollIntervalForMemberCount(memberCount)

  const patchTaskLocal = useCallback((taskId: string, patch: TaskLocalPatch) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)))
  }, [])

  const removeTaskLocal = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }, [])

  const refetch = useCallback(async () => {
    if (!organizationId || !boardId) return
    const data = await fetchBoardTasks(organizationId, boardId)
    setTasks(data)
  }, [organizationId, boardId])

  useEffect(() => {
    if (!organizationId || !boardId) return
    const oid = organizationId
    const bid = boardId
    let cancelled = false
    async function load() {
      try {
        const data = await fetchBoardTasks(oid, bid)
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
  }, [organizationId, boardId, pollMs])

  const grouped = useMemo(() => {
    const todo = tasks.filter((task) => taskPhase(task.status) === 'todo')
    const doing = tasks.filter((task) => taskPhase(task.status) === 'doing')
    const done = tasks.filter((task) => taskPhase(task.status) === 'done')
    return { todo, doing, done, all: tasks }
  }, [tasks])

  return { ...grouped, patchTaskLocal, removeTaskLocal, refetch }
}
