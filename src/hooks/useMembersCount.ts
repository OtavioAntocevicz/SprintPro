import { useEffect } from 'react'
import { create } from 'zustand'
import { fetchMembers } from '../services/apiData'
import { POLL_TEAM_MS } from '../utils/pollInterval'

interface MembersCountState {
  organizationId: string | null
  count: number
  bootstrapped: boolean
  ensure: (organizationId: string) => void
}

let intervalId: number | null = null
let activeOrgId: string | null = null

async function refresh(organizationId: string) {
  try {
    const members = await fetchMembers()
    useMembersCountStore.setState({
      organizationId,
      count: Math.max(1, members.length),
      bootstrapped: true,
    })
  } catch (e) {
    console.error(e)
  }
}

function startPolling(organizationId: string) {
  if (intervalId !== null) {
    window.clearInterval(intervalId)
    intervalId = null
  }
  activeOrgId = organizationId
  void refresh(organizationId)
  intervalId = window.setInterval(() => {
    if (activeOrgId) void refresh(activeOrgId)
  }, POLL_TEAM_MS)
}

export const useMembersCountStore = create<MembersCountState>((set, get) => ({
  organizationId: null,
  count: 1,
  bootstrapped: false,
  ensure: (organizationId) => {
    if (!organizationId) return
    if (get().organizationId === organizationId && intervalId !== null) return
    set({ organizationId })
    startPolling(organizationId)
  },
}))

/** Contagem de membros da org (compartilhada entre hooks de polling). */
export function useMembersCount(organizationId?: string) {
  const count = useMembersCountStore((s) => s.count)
  const ensure = useMembersCountStore((s) => s.ensure)

  useEffect(() => {
    if (organizationId) ensure(organizationId)
  }, [organizationId, ensure])

  return organizationId ? count : 1
}
