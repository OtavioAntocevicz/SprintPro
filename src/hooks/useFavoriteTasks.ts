import { useMemo } from 'react'
import { useOrganizationTasks } from './useOrganizationTasks'

export function useFavoriteTasks(organizationId?: string) {
  const { tasks, loading, error, refetch } = useOrganizationTasks(organizationId)
  const favorites = useMemo(() => tasks.filter((t) => t.favorite), [tasks])
  return { favorites, loading, error, refetch }
}
