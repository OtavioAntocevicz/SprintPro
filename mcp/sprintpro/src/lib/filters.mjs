import { normalizeText, resolveAssignee } from './resolve.mjs'

function parseYmd(value) {
  if (!value) return null
  const s = String(value).slice(0, 10)
  const d = new Date(`${s}T12:00:00.000Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

function todayYmdUtc() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * @param {object[]} tasks
 * @param {object} filters
 * @param {{ id: string, fullName: string, email: string }} selfUser
 * @param {object[]} members
 */
export function filterTasks(tasks, filters, selfUser, members) {
  let list = [...tasks]
  const {
    status,
    assignee,
    priority,
    label,
    search,
    dueBefore,
    dueAfter,
    onlyFavorites,
    limit = 50,
  } = filters

  if (status) {
    list = list.filter((t) => t.status === status)
  }
  if (priority) {
    list = list.filter((t) => t.priority === priority)
  }
  if (onlyFavorites) {
    list = list.filter((t) => Boolean(t.favorite))
  }
  if (label) {
    const lq = normalizeText(label)
    list = list.filter((t) => normalizeText(t.label ?? '').includes(lq))
  }
  if (search) {
    const sq = normalizeText(search)
    list = list.filter(
      (t) =>
        normalizeText(t.title).includes(sq) || normalizeText(t.description ?? '').includes(sq),
    )
  }
  if (assignee) {
    const resolved = resolveAssignee(members, assignee, selfUser)
    if (resolved.member) {
      list = list.filter((t) => t.assignedTo === resolved.member.id)
    }
  }
  const before = parseYmd(dueBefore)
  const after = parseYmd(dueAfter)
  if (before) {
    list = list.filter((t) => {
      const d = parseYmd(t.dueDate)
      return d && d.getTime() <= before.getTime()
    })
  }
  if (after) {
    list = list.filter((t) => {
      const d = parseYmd(t.dueDate)
      return d && d.getTime() >= after.getTime()
    })
  }

  const max = Math.min(Math.max(Number(limit) || 50, 1), 200)
  const totalMatched = list.length
  list = list.slice(0, max)
  return { tasks: list, totalMatched }
}

export function summarizeForAssignee(tasks, assigneeId) {
  const mine = tasks.filter((t) => t.assignedTo === assigneeId && t.status !== 'done')
  const today = todayYmdUtc()
  const overdue = []
  const dueToday = []
  const todo = []
  const doing = []
  const favorites = []

  for (const t of mine) {
    const brief = {
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate,
      priority: t.priority,
      boardId: t.boardId,
    }
    if (t.favorite) favorites.push(brief)
    if (t.status === 'todo') todo.push(brief)
    if (t.status === 'doing') doing.push(brief)
    if (t.dueDate) {
      const due = String(t.dueDate).slice(0, 10)
      if (due < today) overdue.push(brief)
      else if (due === today) dueToday.push(brief)
    }
  }

  return { todo, doing, overdue, dueToday, favorites }
}
