import { clearToken, setToken } from '../lib/apiClient'
import { useAuthStore } from '../store/authStore'
import type { AppUser } from '../types'

type AuthPayload = {
  token: string
  user: AppUser
  organization: { id: string; name: string }
}

function mergeUser(user: AppUser, organization: { name: string }): AppUser {
  return { ...user, organizationName: organization.name }
}

export async function registerOwner(params: {
  email: string
  password: string
  fullName: string
  organizationName: string
}) {
  const data = await apiPost<AuthPayload>('/api/auth/register', {
    email: params.email,
    password: params.password,
    fullName: params.fullName,
    organizationName: params.organizationName,
  })
  setToken(data.token)
  useAuthStore.setState({
    appUser: mergeUser(data.user, data.organization),
    loading: false,
    error: null,
  })
}

export async function loginOwner(email: string, password: string) {
  const data = await apiPost<AuthPayload>('/api/auth/login', { email, password })
  setToken(data.token)
  useAuthStore.setState({
    appUser: mergeUser(data.user, data.organization),
    loading: false,
    error: null,
  })
}

export async function registerWithInvite(params: {
  inviteId: string
  email: string
  password: string
  fullName: string
}) {
  const data = await apiPost<AuthPayload>('/api/auth/register-invite', params)
  setToken(data.token)
  useAuthStore.setState({
    appUser: mergeUser(data.user, data.organization),
    loading: false,
    error: null,
  })
}

export async function requestPasswordReset(email: string) {
  return apiPost<{ ok: true; message: string; resetLink?: string }>('/api/auth/forgot-password', {
    email,
  })
}

export async function resetPassword(token: string, newPassword: string) {
  return apiPost<{ ok: true }>('/api/auth/reset-password', { token, newPassword })
}

export function logout() {
  clearToken()
  useAuthStore.getState().clearSession()
}

/** Login/registo sem token prévio (evita importar apiFetchJson em auth e partilhar lógica de parsing). */
async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const base = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL as string) || ''
  const res = await fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(j.error || `Erro ${res.status}`)
  }
  return (await res.json()) as T
}
