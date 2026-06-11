import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchBoardTasks } from '../services/apiData'
import { taskPhase } from '../utils/taskStatus'
import type { Task } from '../types'

/** Polling em segundo plano; o movimento no Kanban usa atualização local (instantâneo). */
const POLL_MS = 10000

export function useTasks(organizationId?: string, boardId?: string) {
  const [tasks, setTasks] = useState<Task[]>([])

  const patchTaskLocal = useCallback((taskId: string, patch: Partial<Pick<Task, 'status' | 'favorite' | 'notes'>>) => {
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
    const id = window.setInterval(() => void load(), POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [organizationId, boardId])

  const grouped = useMemo(() => {
    const todo = tasks.filter((task) => taskPhase(task.status) === 'todo')
    const doing = tasks.filter((task) => taskPhase(task.status) === 'doing')
    const done = tasks.filter((task) => taskPhase(task.status) === 'done')
    return { todo, doing, done, all: tasks }
  }, [tasks])

  return { ...grouped, patchTaskLocal, removeTaskLocal, refetch }
}
