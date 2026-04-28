import { create } from 'zustand'
import { apiFetchJson, clearToken, getToken } from '../lib/apiClient'
import type { AppUser } from '../types'

type MeResponse = { user: AppUser; organization: { id: string; name: string } }

interface AuthState {
  appUser: AppUser | null
  loading: boolean
  error: string | null
  bootstrapped: boolean
  setError: (error: string | null) => void
  clearSession: () => void
  bootstrap: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  appUser: null,
  loading: true,
  error: null,
  bootstrapped: false,
  setError: (error) => set({ error }),
  clearSession: () => {
    clearToken()
    set({ appUser: null, loading: false, error: null })
  },
  bootstrap: () => {
    if (get().bootstrapped) return
    set({ bootstrapped: true })

    const token = getToken()
    if (!token) {
      set({ appUser: null, loading: false, error: null })
      return
    }

    void (async () => {
      try {
        const me = await apiFetchJson<MeResponse>('GET', '/api/me')
        set({
          appUser: { ...me.user, organizationName: me.organization.name },
          loading: false,
          error: null,
        })
      } catch (err) {
        clearToken()
        const message = err instanceof Error ? err.message : 'Não foi possível carregar o perfil.'
        set({
          appUser: null,
          loading: false,
          error: message,
        })
      }
    })()
  },
}))
