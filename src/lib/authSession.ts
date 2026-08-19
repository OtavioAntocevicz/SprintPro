import type { AppUser } from '../types'

const USER_KEY = 'sprintpro_user'

export function getCachedUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AppUser
  } catch {
    return null
  }
}

export function setCachedUser(user: AppUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearCachedUser() {
  localStorage.removeItem(USER_KEY)
}
