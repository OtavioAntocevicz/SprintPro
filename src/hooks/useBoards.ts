import { useEffect, useState } from 'react'
import { fetchBoards } from '../services/apiData'
import type { Board } from '../types'

const POLL_MS = 3000

export function useBoards(organizationId?: string) {
  const [boards, setBoards] = useState<Board[]>([])

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
    const id = window.setInterval(() => void load(), POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [organizationId])

  return boards
}
