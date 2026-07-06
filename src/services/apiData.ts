import { apiFetchJson } from '../lib/apiClient'
import type { AppUser, Board, Invite, Task, TaskNote, TaskStatus, UserRole } from '../types'

export async function fetchBoards() {
  return apiFetchJson<Board[]>('GET', '/api/boards')
}

export async function createBoard(name: string, organizationId: string) {
  void organizationId
  return apiFetchJson<Board>('POST', '/api/boards', { name })
}

export async function updateBoardFeatured(boardId: string, featured: boolean) {
  return apiFetchJson<Board>('PATCH', `/api/boards/${boardId}/featured`, { featured })
}

export async function fetchBoardTasks(organizationId: string, boardId: string) {
  void organizationId
  return apiFetchJson<Task[]>('GET', `/api/boards/${boardId}/tasks`)
}

export async function fetchOrganizationTasks() {
  return apiFetchJson<Task[]>('GET', '/api/organization/tasks')
}

export async function createTask(params: {
  title: string
  description: string
  label?: string
  priority?: 'low' | 'medium' | 'high'
  dueDate?: string
  assigneeName?: string
  boardId: string
  organizationId: string
  assignedTo: string | null
}) {
  void params.organizationId
  return apiFetchJson<Task>('POST', '/api/tasks', {
    title: params.title,
    description: params.description,
    label: params.label,
    priority: params.priority,
    dueDate: params.dueDate,
    assigneeName: params.assigneeName,
    assignedTo: params.assignedTo,
    boardId: params.boardId,
  })
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  return apiFetchJson<Task>('PATCH', `/api/tasks/${taskId}`, { status })
}

export async function updateTaskFavorite(taskId: string, favorite: boolean) {
  return apiFetchJson<Task>('PATCH', `/api/tasks/${taskId}`, { favorite })
}

export async function fetchTaskNotes(taskId: string) {
  return apiFetchJson<TaskNote[]>('GET', `/api/tasks/${taskId}/notes`)
}

export async function addTaskNote(taskId: string, content: string) {
  return apiFetchJson<TaskNote>('POST', `/api/tasks/${taskId}/notes`, { content })
}

export async function deleteTaskNote(taskId: string, noteId: string) {
  return apiFetchJson<void>('DELETE', `/api/tasks/${taskId}/notes/${noteId}`)
}

export async function deleteTask(taskId: string) {
  return apiFetchJson<void>('DELETE', `/api/tasks/${taskId}`)
}

export async function fetchMembers() {
  return apiFetchJson<AppUser[]>('GET', '/api/organization/members')
}

export async function fetchInvites() {
  return apiFetchJson<Invite[]>('GET', '/api/organization/invites')
}

export async function createInvite(params: { email: string; organizationId: string; role: UserRole }) {
  void params.organizationId
  return apiFetchJson<Invite>('POST', '/api/invites', { email: params.email, role: params.role })
}

export async function updateMemberFavoritePermission(memberId: string, canFavorite: boolean) {
  return apiFetchJson<AppUser>('PATCH', `/api/organization/members/${memberId}/favorite-permission`, {
    canFavorite,
  })
}

export async function deleteMember(memberId: string) {
  return apiFetchJson<void>('DELETE', `/api/organization/members/${memberId}`)
}

export async function updateProfile(fullName: string) {
  return apiFetchJson<AppUser>('PATCH', '/api/settings/profile', { fullName })
}

export async function updateOrganization(name: string) {
  return apiFetchJson<{ id: string; name: string }>('PATCH', '/api/settings/organization', { name })
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return apiFetchJson<{ ok: true }>('POST', '/api/settings/change-password', {
    currentPassword,
    newPassword,
  })
}

export async function deleteMainAccount() {
  return apiFetchJson<void>('DELETE', '/api/settings/account', { confirm: 'EXCLUIR' })
}

export async function sendPresenceHeartbeat() {
  return apiFetchJson<{ ok: true }>('POST', '/api/presence/heartbeat')
}

export async function fetchOnlineUsers() {
  return apiFetchJson<AppUser[]>('GET', '/api/presence/online')
}
