import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { KanbanSection } from '../components/KanbanSection'
import { Layout } from '../components/Layout'
import { useBoards } from '../hooks/useBoards'
import { useTasks } from '../hooks/useTasks'
import { createBoard, createTask, fetchMembers } from '../services/apiData'
import { useAuthStore } from '../store/authStore'
import type { AppUser } from '../types'

export function BoardsPage() {
  const appUser = useAuthStore((state) => state.appUser)
  const canCreateTask = Boolean(appUser?.organizationId)
  const boards = useBoards(appUser?.organizationId)
  const [searchParams, setSearchParams] = useSearchParams()
  const boardIdFromQuery = searchParams.get('boardId')
  const selectedBoardId = boardIdFromQuery ?? boards[0]?.id
  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === selectedBoardId) ?? boards[0],
    [boards, selectedBoardId],
  )
  // Usa o id da URL ou do primeiro quadro, não o objeto: após criar um quadro o
  // snapshot pode atrasar, mas a URL já traz o boardId e a subscription precisa dele.
  const taskState = useTasks(appUser?.organizationId, selectedBoardId)

  const [showTaskModal, setShowTaskModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [label, setLabel] = useState('Desenvolvimento')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [dueDateInput, setDueDateInput] = useState('')
  const [members, setMembers] = useState<AppUser[]>([])
  const [assigneeId, setAssigneeId] = useState('')

  useEffect(() => {
    if (!boardIdFromQuery && boards[0]?.id) {
      setSearchParams({ boardId: boards[0].id })
    }
  }, [boardIdFromQuery, boards, setSearchParams])

  useEffect(() => {
    if (!appUser?.organizationId) return
    let cancelled = false
    async function loadMembers() {
      try {
        const data = await fetchMembers()
        if (!cancelled) setMembers(data)
      } catch (e) {
        console.error(e)
      }
    }
    void loadMembers()
    return () => {
      cancelled = true
    }
  }, [appUser?.organizationId])

  function onDueDateInputChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    let out = ''
    for (let i = 0; i < digits.length; i += 1) {
      if (i === 2 || i === 4) {
        out += '/'
      }
      out += digits[i]
    }
    setDueDateInput(out)
  }

  function parseDateFromPtBr(value: string) {
    const normalized = value.trim()
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized)
    if (!match) return null
    const [, dd, mm, yyyy] = match
    const iso = `${yyyy}-${mm}-${dd}`
    const date = new Date(`${iso}T00:00:00`)
    if (Number.isNaN(date.getTime())) return null
    if (
      date.getFullYear() !== Number(yyyy) ||
      date.getMonth() + 1 !== Number(mm) ||
      date.getDate() !== Number(dd)
    ) {
      return null
    }
    return iso
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError('')

    if (!appUser?.organizationId) {
      setSubmitError('Organização não encontrada para o usuário logado.')
      return
    }
    if (!title.trim()) {
      setSubmitError('Informe um título para a tarefa.')
      return
    }

    const parsedDueDate = dueDateInput ? parseDateFromPtBr(dueDateInput) : null
    if (dueDateInput && !parsedDueDate) {
      setSubmitError('Data inválida. Use o formato dd/mm/aaaa.')
      return
    }

    try {
      setIsSubmitting(true)
      let boardId = selectedBoardId
      if (!boardId) {
        const created = await createBoard('Quadro principal', appUser.organizationId)
        boardId = created.id
        setSearchParams({ boardId })
      }
      await createTask({
        title: title.trim(),
        description: description.trim(),
        label: label.trim(),
        priority,
        dueDate: parsedDueDate || undefined,
        assigneeName: members.find((m) => m.id === assigneeId)?.fullName,
        boardId,
        organizationId: appUser.organizationId,
        assignedTo: assigneeId || null,
      })
      await taskState.refetch()
      setTitle('')
      setDescription('')
      setLabel('Desenvolvimento')
      setPriority('medium')
      setDueDateInput('')
      setAssigneeId('')
      setShowTaskModal(false)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Falha ao criar tarefa.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Layout searchPlaceholder="Buscar tarefas...">
      <section className="mb-5">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-semibold">
            {selectedBoard?.name ?? (selectedBoardId ? 'Quadro' : 'Quadros')}
          </h1>
          <button
            type="button"
            onClick={() => {
              setSubmitError('')
              setShowTaskModal(true)
            }}
            disabled={!canCreateTask}
            className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            + Nova Tarefa
          </button>
        </div>
        <p className="text-slate-500">Kanban operacional da organização</p>
      </section>

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {boards.map((board) => (
            <button
              type="button"
              key={board.id}
              onClick={() => setSearchParams({ boardId: board.id })}
              className={`rounded-full px-3 py-1 text-sm ${
                selectedBoard?.id === board.id
                  ? 'bg-violet-600 text-white'
                  : 'border border-slate-300 bg-white text-slate-600'
              }`}
            >
              {board.name}
            </button>
          ))}
        </div>
        <p className="text-sm text-slate-500">
          Crie tarefas com <strong>Nova Tarefa</strong> e arraste os cartões entre as colunas para alterar a fase.
        </p>
      </section>

      <KanbanSection
        tasks={{ todo: taskState.todo, doing: taskState.doing, done: taskState.done }}
        allTasks={taskState.all}
        onLocalPatch={taskState.patchTaskLocal}
        onLocalRemove={taskState.removeTaskLocal}
        onRefetch={taskState.refetch}
      />

      {showTaskModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Nova Tarefa</h2>
                <p className="text-sm text-slate-500">A tarefa será criada na coluna A fazer.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTaskModal(false)
                  setSubmitError('')
                }}
                className="rounded bg-slate-100 px-2 py-1 text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Título</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Ex: Implementar fluxo de convite"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Descreva a tarefa com detalhes"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Categoria</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Desenvolvimento"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Prioridade</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Responsável</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">Sem responsável</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName || member.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Prazo</label>
                <input
                  type="text"
                  value={dueDateInput}
                  onChange={(e) => onDueDateInputChange(e.target.value)}
                  placeholder="dd/mm/aaaa"
                  autoComplete="off"
                  maxLength={10}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
                <p className="mt-1 text-xs text-slate-500">Formato: dd/mm/aaaa</p>
              </div>

              <div className="mt-2 flex items-center justify-end gap-2 md:col-span-2">
                {submitError && (
                  <p className="mr-auto text-sm text-red-600">{submitError}</p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskModal(false)
                    setSubmitError('')
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  disabled={isSubmitting}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-white disabled:opacity-60"
                >
                  {isSubmitting ? 'Criando...' : 'Criar tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
