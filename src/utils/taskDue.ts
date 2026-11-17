import type { Task } from '../types'

export type DueTone = 'none' | 'overdue' | 'today' | 'soon' | 'later'

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function daysUntil(dueDate: string, today: Date) {
  const due = new Date(`${dueDate.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(due.getTime())) return null
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

/** Classifica o prazo de uma tarefa (tarefas concluídas nunca ficam "atrasadas"). */
export function dueTone(task: Pick<Task, 'dueDate' | 'status'>, today: Date = startOfToday()): DueTone {
  if (!task.dueDate) return 'none'
  if (task.status === 'done') return 'later'
  const days = daysUntil(task.dueDate, today)
  if (days === null) return 'none'
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days <= 3) return 'soon'
  return 'later'
}

export function formatDueDate(dueDate?: string) {
  if (!dueDate) return 'Sem prazo'
  return new Date(`${dueDate.slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

/** Prazo em linguagem natural: "Hoje", "Amanhã", "Em 3 dias", "2 dias atrasada"; datas distantes viram "19 de nov." */
export function relativeDueLabel(
  task: Pick<Task, 'dueDate' | 'status'>,
  today: Date = startOfToday(),
): string {
  if (!task.dueDate) return 'Sem prazo'
  const days = daysUntil(task.dueDate, today)
  if (days === null || task.status === 'done') return formatDueDate(task.dueDate)
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Amanhã'
  if (days === -1) return 'Ontem'
  if (days < 0) return `${-days} dias atrasada`
  if (days <= 6) return `Em ${days} dias`
  return formatDueDate(task.dueDate)
}
