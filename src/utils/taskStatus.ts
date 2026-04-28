import type { TaskStatus } from '../types'

/** Fase do Kanban (Firestore `status`); não confundir com o campo `label` (categoria do card). */
export function taskPhase(status: string | undefined): TaskStatus {
  if (status === 'todo' || status === 'doing' || status === 'done') {
    return status
  }
  return 'todo'
}

export const phaseOptions: { value: TaskStatus; label: string; short: string }[] = [
  { value: 'todo', label: 'A fazer', short: 'A fazer' },
  { value: 'doing', label: 'Em progresso', short: 'Em progresso' },
  { value: 'done', label: 'Concluído', short: 'Concluído' },
]
