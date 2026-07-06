export type UserRole = 'owner' | 'member'
export type InviteStatus = 'pending' | 'accepted'
export type TaskStatus = 'todo' | 'doing' | 'done'

export interface Organization {
  id: string
  name: string
  ownerId: string
  createdAt: string
}

export interface AppUser {
  id: string
  fullName: string
  email: string
  organizationId: string
  role: UserRole
  canFavorite?: boolean
  createdAt: string
  lastSeenAt?: string
  /** Preenchido pelo backend (perfil + login). */
  organizationName?: string
}

export interface Invite {
  id: string
  email: string
  organizationId: string
  role: UserRole
  status: InviteStatus
  createdAt: string
}

export interface Board {
  id: string
  name: string
  organizationId: string
  featured?: boolean
  createdAt: string
}

export interface TaskNote {
  id: string
  taskId: string
  content: string
  authorId: string | null
  authorName: string
  createdAt: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  boardId: string
  organizationId: string
  label?: string
  priority?: 'low' | 'medium' | 'high'
  dueDate?: string
  assigneeName?: string
  favorite?: boolean
  notesCount?: number
  assignedTo: string | null
  createdAt: string
}
