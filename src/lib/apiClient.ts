const TOKEN_KEY = 'sprintpro_token'

export { TOKEN_KEY }

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

function apiBase() {
  if (import.meta.env.DEV) return ''
  return (import.meta.env.VITE_API_URL as string) || ''
}

export async function apiFetchJson<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (res.status === 401 && token) {
    clearToken()
    window.dispatchEvent(new CustomEvent('sprintpro:session-expired'))
  }
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(j.error || `Erro ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
