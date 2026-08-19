import { create } from 'zustand'
import { clearCachedUser, getCachedUser, setCachedUser } from '../lib/authSession'
import { apiFetchJson, clearToken, getToken, isUnauthorizedError } from '../lib/apiClient'
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
  revalidateSession: () => Promise<void>
}

function buildAppUser(me: MeResponse): AppUser {
  return { ...me.user, organizationName: me.organization.name }
}

async function fetchSessionProfile(): Promise<AppUser> {
  const me = await apiFetchJson<MeResponse>('GET', '/api/me')
  const appUser = buildAppUser(me)
  setCachedUser(appUser)
  return appUser
}

export const useAuthStore = create<AuthState>((set, get) => ({
  appUser: null,
  loading: true,
  error: null,
  bootstrapped: false,
  setError: (error) => set({ error }),
  clearSession: () => {
    clearToken()
    clearCachedUser()
    set({ appUser: null, loading: false, error: null })
  },
  revalidateSession: async () => {
    const token = getToken()
    if (!token) {
      set({ appUser: null, loading: false, error: null })
      return
    }

    set({ loading: true, error: null })

    try {
      const appUser = await fetchSessionProfile()
      set({ appUser, loading: false, error: null })
    } catch (err) {
      if (isUnauthorizedError(err)) {
        clearToken()
        clearCachedUser()
        set({ appUser: null, loading: false, error: null })
        return
      }

      const cachedUser = getCachedUser()
      set({
        appUser: cachedUser ?? get().appUser,
        loading: false,
        error: err instanceof Error ? err.message : 'Não foi possível carregar o perfil.',
      })
    }
  },
  bootstrap: () => {
    if (get().bootstrapped) return
    set({ bootstrapped: true })

    const token = getToken()
    if (!token) {
      set({ appUser: null, loading: false, error: null })
      return
    }

    const cachedUser = getCachedUser()
    if (cachedUser) {
      set({ appUser: cachedUser, loading: true, error: null })
    }

    void get().revalidateSession()
  },
}))
