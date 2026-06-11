import { create } from 'zustand'

const STORAGE_KEY = 'sprintpro-sidebar-collapsed'

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function saveCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  } catch {
    /* ignore */
  }
}

interface SidebarState {
  collapsed: boolean
  toggleCollapsed: () => void
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  collapsed: loadCollapsed(),
  toggleCollapsed: () => {
    const next = !get().collapsed
    saveCollapsed(next)
    set({ collapsed: next })
  },
}))
