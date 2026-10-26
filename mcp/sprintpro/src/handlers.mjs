import { filterTasks, summarizeForAssignee } from './lib/filters.mjs'
import { resolveAssignee, resolveBoard, resolveTaskId } from './lib/resolve.mjs'

async function requireSession(client) {
  const session = await client.getSession()
  if (!session.ok) return session
  const { user, organization } = session.data
  return client.ok({ user, organization })
}

export function createHandlers(client) {
  return {
    async whoami() {
      const s = await requireSession(client)
      if (!s.ok) return s
      return client.ok({
        user: s.data.user,
        organization: s.data.organization,
      })
    },

    async list_boards() {
      const boards = await client.getBoards()
      if (!boards.ok) return boards
      return client.ok({ boards: boards.data })
    },

    async create_board({ name }) {
      const n = String(name ?? '').trim()
      if (!n) return client.fail('name é obrigatório.')
      const created = await client.createBoard(n)
      if (!created.ok) return created
      return client.ok({ board: created.data })
    },

    async list_members() {
      const members = await client.getMembers()
      if (!members.ok) return members
      return client.ok({ members: members.data })
    },

    async resolve_assignee({ query }) {
      const s = await requireSession(client)
      if (!s.ok) return s
      const members = await client.getMembers()
      if (!members.ok) return members
      const resolved = resolveAssignee(members.data, query, s.data.user)
      if (resolved.error) return client.fail(resolved.error)
      if (resolved.ambiguous) {
        return client.fail('Vários membros correspondem. Refine o nome ou use o e-mail.', {
          candidates: resolved.candidates.map((m) => ({
            id: m.id,
            fullName: m.fullName,
            email: m.email,
          })),
        })
      }
      return client.ok({ member: resolved.member })
    },

    async list_categories() {
      const cats = await client.getCategories()
      if (!cats.ok) return cats
      return client.ok({ categories: cats.data })
    },

    async list_tasks(input) {
      const scope = input.scope
      const s = await requireSession(client)
      if (!s.ok) return s
      const members = await client.getMembers()
      if (!members.ok) return members

      let tasks = []
      if (scope === 'board') {
        const boards = await client.getBoards()
        if (!boards.ok) return boards
        const resolved = resolveBoard(boards.data, input.board, client.defaultBoardName)
        if (resolved.error) {
          return client.fail(resolved.error, resolved.candidates ? { candidates: resolved.candidates } : undefined)
        }
        if (resolved.ambiguous) {
          return client.fail('Vários quadros correspondem.', {
            candidates: resolved.candidates,
          })
        }
        const list = await client.getBoardTasks(resolved.board.id)
        if (!list.ok) return list
        tasks = list.data
      } else if (scope === 'organization') {
        const list = await client.getOrganizationTasks()
        if (!list.ok) return list
        tasks = list.data
      } else if (scope === 'completed') {
        const list = await client.getCompletedTasks()
        if (!list.ok) return list
        tasks = list.data
      } else {
        return client.fail('scope inválido. Use board, organization ou completed.')
      }

      const filtered = filterTasks(tasks, input, s.data.user, members.data)
      return client.ok(filtered)
    },

    async get_task({ taskId, taskHint, board, matchStrategy }) {
      const resolvedId = await resolveTaskId(client, {
        taskId,
        taskHint,
        board,
        matchStrategy: matchStrategy || 'ask',
      })
      if (!resolvedId.ok) return resolvedId
      const id = resolvedId.data.taskId
      const notes = await client.getTaskNotes(id)
      if (!notes.ok) return notes
      const orgTasks = await client.getOrganizationTasks()
      if (!orgTasks.ok) return orgTasks
      const task = orgTasks.data.find((t) => t.id === id)
      if (!task) return client.fail('Tarefa não encontrada.')
      return client.ok({
        task,
        notes: notes.data,
        note: resolvedId.data.note,
      })
    },

    async create_task(input) {
      const s = await requireSession(client)
      if (!s.ok) return s
      const title = String(input.title ?? '').trim()
      if (!title) return client.fail('title é obrigatório.')

      const boards = await client.getBoards()
      if (!boards.ok) return boards
      const boardResolved = resolveBoard(boards.data, input.board, client.defaultBoardName)
      if (boardResolved.error) {
        return client.fail(boardResolved.error, boardResolved.candidates ? { candidates: boardResolved.candidates } : undefined)
      }
      if (boardResolved.ambiguous) {
        return client.fail('Vários quadros correspondem.', { candidates: boardResolved.candidates })
      }

      const members = await client.getMembers()
      if (!members.ok) return members
      const assigneeResolved = resolveAssignee(
        members.data,
        input.assignee ?? 'eu',
        s.data.user,
      )
      if (assigneeResolved.error) return client.fail(assigneeResolved.error)
      if (assigneeResolved.ambiguous) {
        return client.fail('Vários responsáveis correspondem.', {
          candidates: assigneeResolved.candidates,
        })
      }

      const body = {
        boardId: boardResolved.board.id,
        title,
        description: input.description ?? '',
        assignedTo: assigneeResolved.member.id,
        assigneeName: assigneeResolved.member.fullName,
      }
      if (input.priority) body.priority = input.priority
      if (input.dueDate) body.dueDate = input.dueDate
      if (input.label) body.label = input.label

      const created = await client.createTask(body)
      if (!created.ok) return created
      return client.ok({ task: created.data })
    },

    async update_task(input) {
      const resolvedId = await resolveTaskId(client, {
        taskId: input.taskId,
        taskHint: input.taskHint,
        board: input.board,
        matchStrategy: input.matchStrategy || 'ask',
      })
      if (!resolvedId.ok) return resolvedId

      const patch = {}
      if (input.title !== undefined) patch.title = input.title
      if (input.description !== undefined) patch.description = input.description
      if (input.status !== undefined) patch.status = input.status
      if (input.priority !== undefined) patch.priority = input.priority
      if (input.dueDate !== undefined) patch.dueDate = input.dueDate
      if (input.label !== undefined) patch.label = input.label
      if (input.favorite !== undefined) patch.favorite = input.favorite

      if (input.assignee !== undefined) {
        const s = await requireSession(client)
        if (!s.ok) return s
        const members = await client.getMembers()
        if (!members.ok) return members
        const assigneeResolved = resolveAssignee(members.data, input.assignee, s.data.user)
        if (assigneeResolved.error) return client.fail(assigneeResolved.error)
        if (assigneeResolved.ambiguous) {
          return client.fail('Vários responsáveis correspondem.', {
            candidates: assigneeResolved.candidates,
          })
        }
        patch.assignedTo = assigneeResolved.member.id
        patch.assigneeName = assigneeResolved.member.fullName
      }

      if (!Object.keys(patch).length) {
        return client.fail('Informe ao menos um campo para atualizar.')
      }

      const updated = await client.updateTask(resolvedId.data.taskId, patch)
      if (!updated.ok) return updated
      return client.ok({ task: updated.data, note: resolvedId.data.note })
    },

    async add_task_note({ taskId, taskHint, board, matchStrategy, content }) {
      const text = String(content ?? '').trim()
      if (!text) return client.fail('content é obrigatório.')
      const resolvedId = await resolveTaskId(client, {
        taskId,
        taskHint,
        board,
        matchStrategy: matchStrategy || 'ask',
      })
      if (!resolvedId.ok) return resolvedId
      const note = await client.addTaskNote(resolvedId.data.taskId, text)
      if (!note.ok) return note
      return client.ok({ note: note.data, taskId: resolvedId.data.taskId })
    },

    async complete_task({ taskId, taskHint, board, matchStrategy, note }) {
      const resolvedId = await resolveTaskId(client, {
        taskId,
        taskHint,
        board,
        matchStrategy: matchStrategy || 'ask',
      })
      if (!resolvedId.ok) return resolvedId
      const updated = await client.updateTask(resolvedId.data.taskId, { status: 'done' })
      if (!updated.ok) return updated
      let createdNote
      if (note && String(note).trim()) {
        const n = await client.addTaskNote(resolvedId.data.taskId, String(note).trim())
        if (n.ok) createdNote = n.data
      }
      return client.ok({
        task: updated.data,
        note: createdNote,
        resolutionNote: resolvedId.data.note,
      })
    },

    async summarize_workload({ assignee, board }) {
      const s = await requireSession(client)
      if (!s.ok) return s
      const members = await client.getMembers()
      if (!members.ok) return members
      const who = resolveAssignee(members.data, assignee ?? 'eu', s.data.user)
      if (who.error) return client.fail(who.error)
      if (who.ambiguous) {
        return client.fail('Vários membros correspondem.', { candidates: who.candidates })
      }

      let tasks = []
      if (board) {
        const boards = await client.getBoards()
        if (!boards.ok) return boards
        const b = resolveBoard(boards.data, board, client.defaultBoardName)
        if (b.error) return client.fail(b.error)
        if (b.ambiguous) return client.fail('Vários quadros correspondem.', { candidates: b.candidates })
        const list = await client.getBoardTasks(b.board.id)
        if (!list.ok) return list
        tasks = list.data
      } else {
        const list = await client.getOrganizationTasks()
        if (!list.ok) return list
        tasks = list.data
      }

      const summary = summarizeForAssignee(tasks, who.member.id)
      return client.ok({
        assignee: {
          id: who.member.id,
          fullName: who.member.fullName,
        },
        ...summary,
      })
    },
  }
}

export function toolResultFromHandler(result) {
  const payload = result.ok
    ? { ok: true, data: result.data, ...(result.note ? { note: result.note } : {}) }
    : { ok: false, error: result.error, ...(result.data !== undefined ? { data: result.data } : {}) }
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    isError: !result.ok,
  }
}
