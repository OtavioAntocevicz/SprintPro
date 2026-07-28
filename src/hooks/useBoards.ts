import { useEffect, useState } from 'react'
import { fetchBoards } from '../services/apiData'
import { useMembersCount } from './useMembersCount'
import { pollIntervalForMemberCount } from '../utils/pollInterval'
import type { Board } from '../types'

export function useBoards(organizationId?: string) {
  const [boards, setBoards] = useState<Board[]>([])
  const memberCount = useMembersCount(organizationId)
  const pollMs = pollIntervalForMemberCount(memberCount)

  useEffect(() => {
    if (!organizationId) return
    let cancelled = false
    async function load() {
      try {
        const data = await fetchBoards()
        if (!cancelled) setBoards(data)
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

  return boards
}
