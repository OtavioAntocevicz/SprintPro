import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { BoardTaskFilters } from '../components/BoardTaskFilters'
import { KanbanSection } from '../components/KanbanSection'
import { Layout } from '../components/Layout'
import { useBoards } from '../hooks/useBoards'
import { useTasks } from '../hooks/useTasks'
import { createBoard, createTask, fetchCategories, fetchMembers } from '../services/apiData'
import { useAuthStore } from '../store/authStore'
import type { AppUser, TaskCategory } from '../types'
import { defaultTaskFilters, filterTasks, type TaskFilters } from '../utils/filterTasks'
import { taskPhase } from '../utils/taskStatus'

const OTHER_CATEGORY = '__other__'

export function BoardsPage() {
  const appUser = useAuthStore((state) => state.appUser)
  const canCreateTask = Boolean(appUser?.organizationId)
  const boards = useBoards(appUser?.organizationId)
  const [pendingBoardId, setPendingBoardId] = useState<string>()
  const boardId = boards[0]?.id ?? pendingBoardId
  const taskState = useTasks(appUser?.organizationId, boardId)

  const [showTaskModal, setShowTaskModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categorySelect, setCategorySelect] = useState(OTHER_CATEGORY)
  const [customLabel, setCustomLabel] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [dueDateInput, setDueDateInput] = useState('')
  const [members, setMembers] = useState<AppUser[]>([])
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [assigneeId, setAssigneeId] = useState('')
  const [taskFilters, setTaskFilters] = useState<TaskFilters>(defaultTaskFilters)

  useEffect(() => {
    if (!appUser?.organizationId) return
    let cancelled = false
    async function load() {
      try {
        const [membersData, categoriesData] = await Promise.all([fetchMembers(), fetchCategories()])
        if (!cancelled) {
          setMembers(membersData)
          setCategories(categoriesData)
          setCategorySelect(categoriesData[0]?.name ?? OTHER_CATEGORY)
        }
      } catch (e) {
        console.error(e)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [appUser?.organizationId])

  const labelOptions = useMemo(() => {
    const names = new Set<string>()
    for (const category of categories) {
      if (category.name.trim()) names.add(category.name.trim())
    }
    for (const task of taskState.all) {
      const label = task.label?.trim()
      if (label) names.add(label)
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [categories, taskState.all])

  const showCustomLabel = categorySelect === OTHER_CATEGORY

  const filteredTasks = useMemo(
    () => filterTasks(taskState.all, taskFilters),
    [taskState.all, taskFilters],
  )

  const filteredGrouped = useMemo(
    () => ({
      todo: filteredTasks.filter((task) => taskPhase(task.status) === 'todo'),
      doing: filteredTasks.filter((task) => taskPhase(task.status) === 'doing'),
      done: filteredTasks.filter((task) => taskPhase(task.status) === 'done'),
    }),
    [filteredTasks],
  )

  function resetCategoryFields() {
    setCategorySelect(categories[0]?.name ?? OTHER_CATEGORY)
    setCustomLabel('')
  }

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

    const resolvedLabel =
      categorySelect === OTHER_CATEGORY ? customLabel.trim() : categorySelect.trim()
    if (!resolvedLabel) {
      setSubmitError(
        categorySelect === OTHER_CATEGORY
          ? 'Informe a categoria em Outros.'
          : 'Selecione uma categoria.',
      )
      return
    }

    const parsedDueDate = dueDateInput ? parseDateFromPtBr(dueDateInput) : null
    if (dueDateInput && !parsedDueDate) {
      setSubmitError('Data inválida. Use o formato dd/mm/aaaa.')
      return
    }

    try {
      setIsSubmitting(true)
      let activeBoardId = boardId
      if (!activeBoardId) {
        const created = await createBoard('Quadro principal', appUser.organizationId)
        activeBoardId = created.id
        setPendingBoardId(created.id)
      }
      await createTask({
        title: title.trim(),
        description: description.trim(),
        label: resolvedLabel,
        priority,
        dueDate: parsedDueDate || undefined,
        assigneeName: members.find((m) => m.id === assigneeId)?.fullName,
        boardId: activeBoardId,
        organizationId: appUser.organizationId,
        assignedTo: assigneeId || null,
      })
      await taskState.refetch()
      setTitle('')
      setDescription('')
      resetCategoryFields()
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold">Quadros</h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">Kanban operacional da organização</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSubmitError('')
              resetCategoryFields()
              setShowTaskModal(true)
            }}
            disabled={!canCreateTask}
            className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            + Nova Tarefa
          </button>
        </div>
      </section>

      <BoardTaskFilters
        filters={taskFilters}
        members={members}
        labelOptions={labelOptions}
        totalCount={taskState.all.length}
        filteredCount={filteredTasks.length}
        onChange={setTaskFilters}
      />

      <KanbanSection
        tasks={filteredGrouped}
        allTasks={filteredTasks}
        onLocalPatch={taskState.patchTaskLocal}
        onLocalRemove={taskState.removeTaskLocal}
        onRefetch={taskState.refetch}
      />

      {showTaskModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 dark:bg-black/60">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Nova Tarefa</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">A tarefa será criada na coluna A fazer.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTaskModal(false)
                  setSubmitError('')
                }}
                className="rounded bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Título</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Ex: Implementar fluxo de convite"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Descreva a tarefa com detalhes"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Categoria</label>
                <select
                  value={categorySelect}
                  onChange={(e) => setCategorySelect(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                  <option value={OTHER_CATEGORY}>Outros</option>
                </select>
                {showCustomLabel && (
                  <input
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="Digite a categoria"
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Prioridade</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Responsável</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Prazo</label>
                <input
                  type="text"
                  value={dueDateInput}
                  onChange={(e) => onDueDateInputChange(e.target.value)}
                  placeholder="dd/mm/aaaa"
                  autoComplete="off"
                  maxLength={10}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Formato: dd/mm/aaaa</p>
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
                  className="rounded-lg border border-slate-300 px-4 py-2 text-slate-600 dark:border-slate-600 dark:text-slate-300"
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
