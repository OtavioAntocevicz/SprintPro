export function ok(data, extra = {}) {
  return { ok: true, data, ...extra }
}

export function fail(error, data = undefined) {
  return { ok: false, error, data }
}

export class SprintProClient {
  constructor({ baseUrl, token, defaultBoardName }) {
    this.baseUrl = baseUrl
    this.token = token
    this.defaultBoardName = defaultBoardName
    this._session = null
  }

  ok = ok
  fail = fail

  async request(path, { method = 'GET', body } = {}) {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
      if (res.status === 204) return ok(null)
      const text = await res.text()
      let parsed
      try {
        parsed = text ? JSON.parse(text) : null
      } catch {
        parsed = { raw: text }
      }
      if (!res.ok) {
        const message =
          parsed && typeof parsed === 'object' && parsed.error
            ? String(parsed.error)
            : `HTTP ${res.status}`
        return fail(message, parsed)
      }
      return ok(parsed)
    } catch (e) {
      return fail(e instanceof Error ? e.message : 'Erro de rede ao chamar a API.')
    }
  }

  async getSession(force = false) {
    if (this._session && !force) return ok(this._session)
    const me = await this.request('/api/me')
    if (!me.ok) return me
    this._session = me.data
    return ok(this._session)
  }

  getBoards() {
    return this.request('/api/boards')
  }

  getMembers() {
    return this.request('/api/organization/members')
  }

  getCategories() {
    return this.request('/api/organization/categories')
  }

  getBoardTasks(boardId) {
    return this.request(`/api/boards/${boardId}/tasks`)
  }

  getOrganizationTasks() {
    return this.request('/api/organization/tasks')
  }

  getCompletedTasks() {
    return this.request('/api/organization/completed-tasks')
  }

  getTaskNotes(taskId) {
    return this.request(`/api/tasks/${taskId}/notes`)
  }

  createTask(body) {
    return this.request('/api/tasks', { method: 'POST', body })
  }

  updateTask(taskId, body) {
    return this.request(`/api/tasks/${taskId}`, { method: 'PATCH', body })
  }

  addTaskNote(taskId, content) {
    return this.request(`/api/tasks/${taskId}/notes`, {
      method: 'POST',
      body: { content },
    })
  }

  createBoard(name) {
    return this.request('/api/boards', { method: 'POST', body: { name } })
  }
}
