const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value.trim())
}

export function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

/** @param {{ id: string, fullName: string, email: string }[]} members */
export function resolveAssignee(members, query, selfUser) {
  const q = normalizeText(query)
  if (!q) {
    return { member: selfUser, ambiguous: false }
  }
  if (['eu', 'mim', 'me', 'myself'].includes(q)) {
    return { member: selfUser, ambiguous: false }
  }
  if (isUuid(query)) {
    const byId = members.find((m) => m.id === query.trim())
    if (byId) return { member: byId, ambiguous: false }
    return { error: 'Nenhum membro com esse ID na organização.' }
  }
  const matches = members.filter((m) => {
    const name = normalizeText(m.fullName)
    const email = normalizeText(m.email)
    return name.includes(q) || email.includes(q) || q.includes(name)
  })
  if (matches.length === 1) return { member: matches[0], ambiguous: false }
  if (matches.length > 1) return { candidates: matches, ambiguous: true }
  return { error: `Nenhum membro encontrado para "${query}".` }
}

/** @param {{ id: string, name: string }[]} boards */
export function resolveBoard(boards, query, defaultBoardName) {
  if (!boards.length) {
    return { error: 'Nenhum quadro na organização. Crie um quadro no SprintPro.' }
  }
  const raw = String(query ?? '').trim()
  if (!raw) {
    if (defaultBoardName) {
      const byDefault = boards.find(
        (b) => normalizeText(b.name) === normalizeText(defaultBoardName),
      )
      if (byDefault) return { board: byDefault, ambiguous: false }
    }
    if (boards.length === 1) return { board: boards[0], ambiguous: false }
    return {
      error:
        'Informe o quadro (nome ou ID) ou defina SPRINTPRO_DEFAULT_BOARD_NAME no MCP.',
      candidates: boards,
    }
  }
  if (isUuid(raw)) {
    const byId = boards.find((b) => b.id === raw)
    if (byId) return { board: byId, ambiguous: false }
    return { error: 'Quadro não encontrado.' }
  }
  const q = normalizeText(raw)
  const exact = boards.filter((b) => normalizeText(b.name) === q)
  if (exact.length === 1) return { board: exact[0], ambiguous: false }
  const partial = boards.filter((b) => normalizeText(b.name).includes(q))
  if (partial.length === 1) return { board: partial[0], ambiguous: false }
  if (partial.length > 1) return { candidates: partial, ambiguous: true }
  return { error: `Nenhum quadro encontrado para "${raw}".` }
}

/** @param {{ id: string, title: string, createdAt?: string }[]} tasks */
export function resolveTaskByHint(tasks, hint, matchStrategy = 'ask') {
  const q = normalizeText(hint)
  if (!q) return { error: 'Informe taskId ou taskHint.' }
  const matches = tasks.filter((t) => normalizeText(t.title).includes(q))
  if (matches.length === 0) {
    return { error: `Nenhuma tarefa encontrada para "${hint}".` }
  }
  if (matches.length === 1) return { task: matches[0], ambiguous: false }
  if (matchStrategy === 'newest') {
    const sorted = [...matches].sort(
      (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
    )
    return { task: sorted[0], ambiguous: false, note: 'Várias tarefas; escolhida a mais recente.' }
  }
  return { candidates: matches.slice(0, 10), ambiguous: true }
}

export async function resolveTaskId(client, { taskId, taskHint, board, matchStrategy }) {
  if (taskId && isUuid(taskId)) return client.ok({ taskId: taskId.trim() })
  if (!taskHint) return { error: 'Informe taskId ou taskHint.' }
  let tasks = []
  if (board) {
    const boardRes = await client.getBoards()
    if (!boardRes.ok) return boardRes
    const resolved = resolveBoard(boardRes.data, board, client.defaultBoardName)
    if (resolved.error) return client.fail(resolved.error, resolved.candidates)
    const list = await client.getBoardTasks(resolved.board.id)
    if (!list.ok) return list
    tasks = list.data
  } else {
    const list = await client.getOrganizationTasks()
    if (!list.ok) return list
    tasks = list.data
  }
  const picked = resolveTaskByHint(tasks, taskHint, matchStrategy)
  if (picked.error) return client.fail(picked.error)
  if (picked.ambiguous) {
    return client.fail('Várias tarefas correspondem. Use taskId ou refine o título.', {
      candidates: picked.candidates.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        boardId: t.boardId,
      })),
    })
  }
  return client.ok({ taskId: picked.task.id, note: picked.note })
}
