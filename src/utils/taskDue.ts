import type { Task } from '../types'

export type DueTone = 'none' | 'overdue' | 'today' | 'soon' | 'later'

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** Classifica o prazo de uma tarefa (tarefas concluídas nunca ficam "atrasadas"). */
export function dueTone(task: Pick<Task, 'dueDate' | 'status'>, today: Date = startOfToday()): DueTone {
  if (!task.dueDate) return 'none'
  if (task.status === 'done') return 'later'
  const due = new Date(`${task.dueDate.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(due.getTime())) return 'none'
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000)
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

export const dueToneClass: Record<DueTone, string> = {
  none: 'text-slate-400 dark:text-slate-500',
  later: 'text-slate-500 dark:text-slate-400',
  soon: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  today: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  overdue: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300',
}

export const dueToneLabel: Partial<Record<DueTone, string>> = {
  overdue: 'Atrasada',
  today: 'Vence hoje',
}

export const priorityBadgeClass: Record<'low' | 'medium' | 'high', string> = {
  low: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-900',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-900',
  high: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-900',
}

export const priorityStripeClass: Record<'low' | 'medium' | 'high', string> = {
  low: 'before:bg-emerald-400',
  medium: 'before:bg-amber-400',
  high: 'before:bg-red-500',
}
