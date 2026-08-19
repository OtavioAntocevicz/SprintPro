import { useCallback, useEffect, useState } from 'react'
import { fetchOrganizationTasks } from '../services/apiData'
import { useMembersCount } from './useMembersCount'
import { pollIntervalForMemberCount } from '../utils/pollInterval'
import type { Task } from '../types'

export function useOrganizationTasks(organizationId?: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const memberCount = useMembersCount(organizationId)
  const pollMs = pollIntervalForMemberCount(memberCount)

  const refetch = useCallback(async () => {
    if (!organizationId) return
    setError('')
    try {
      const data = await fetchOrganizationTasks()
      setTasks(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar as tarefas.')
      throw e
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    if (!organizationId) {
      setTasks([])
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      try {
        const data = await fetchOrganizationTasks()
        if (!cancelled) {
          setTasks(data)
          setError('')
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Não foi possível carregar as tarefas.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    setLoading(true)
    void load()
    const id = window.setInterval(() => void load(), pollMs)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [organizationId, pollMs])

  return { tasks, loading, error, refetch, memberCount }
}
