import { resolveAssignee, resolveBoard } from './resolve.mjs'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const PRIORITIES = new Set(['low', 'medium', 'high'])

/**
 * Valida e resolve um lote de tarefas sem chamar a API.
 * Retorna { plan, errors }: plan tem os corpos prontos para POST /api/tasks;
 * errors lista o índice e o motivo de cada item inválido (com candidatos quando ambíguo).
 *
 * @param {{
 *   tasks: Array<{ title?: string, board?: string, description?: string, assignee?: string,
 *                  priority?: string, dueDate?: string, label?: string }>,
 *   boards: { id: string, name: string }[],
 *   members: { id: string, fullName: string, email: string }[],
 *   selfUser: { id: string, fullName: string, email: string },
 *   defaultBoard?: string,
 *   defaultBoardName?: string,
 * }} input
 */
export function planBulkTasks({ tasks, boards, members, selfUser, defaultBoard, defaultBoardName }) {
  const plan = []
  const errors = []

  if (!Array.isArray(tasks) || tasks.length === 0) {
    return { plan, errors: [{ index: -1, error: 'Envie ao menos uma tarefa em "tasks".' }] }
  }

  tasks.forEach((task, index) => {
    const title = String(task?.title ?? '').trim()
    if (!title) {
      errors.push({ index, error: 'title é obrigatório.' })
      return
    }

    const boardQuery = task.board ?? defaultBoard ?? ''
    const b = resolveBoard(boards, boardQuery, defaultBoardName)
    if (b.error || b.ambiguous) {
      errors.push({
        index,
        title,
        error: b.error || `Vários quadros correspondem a "${boardQuery}".`,
        candidates: (b.candidates || []).map((c) => c.name),
      })
      return
    }

    const a = resolveAssignee(members, task.assignee ?? 'eu', selfUser)
    if (a.error || a.ambiguous) {
      errors.push({
        index,
        title,
        error: a.error || `Vários membros correspondem a "${task.assignee}".`,
        candidates: (a.candidates || []).map((m) => `${m.fullName} <${m.email}>`),
      })
      return
    }

    if (task.dueDate && !DATE_RE.test(String(task.dueDate))) {
      errors.push({ index, title, error: `dueDate inválida "${task.dueDate}" (use YYYY-MM-DD).` })
      return
    }
    if (task.priority && !PRIORITIES.has(task.priority)) {
      errors.push({ index, title, error: `priority inválida "${task.priority}" (low, medium, high).` })
      return
    }

    const body = {
      boardId: b.board.id,
      title,
      description: task.description ?? '',
      assignedTo: a.member.id,
      assigneeName: a.member.fullName,
    }
    if (task.priority) body.priority = task.priority
    if (task.dueDate) body.dueDate = task.dueDate
    if (task.label) body.label = task.label

    plan.push({ index, body, boardName: b.board.name })
  })

  return { plan, errors }
}
