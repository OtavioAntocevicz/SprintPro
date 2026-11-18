import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '../components/AsyncState'
import { BoardTaskFilters } from '../components/BoardTaskFilters'
import { KanbanSection } from '../components/KanbanSection'
import { Layout } from '../components/Layout'
import {
  DropdownMenu,
  IconDots,
  Modal,
  PageHeader,
  type MenuItem,
} from '../components/ui'
import { buttonClass, inputClass, labelClass } from '../components/uiStyles'
import { useBoards } from '../hooks/useBoards'
import { useTasks } from '../hooks/useTasks'
import {
  createBoard,
  createTask,
  deleteBoard,
  fetchCategories,
  fetchMembers,
  updateBoard,
  updateBoardFeatured,
} from '../services/apiData'
import { useAuthStore } from '../store/authStore'
import { useHeaderSearchStore } from '../store/headerSearchStore'
import type { AppUser, TaskCategory } from '../types'
import {
  defaultTaskFilters,
  filterTasks,
  type TaskDueFilter,
  type TaskFilters,
} from '../utils/filterTasks'
import { resolveDefaultAssigneeId, setLastAssigneeId } from '../utils/lastAssignee'
import { taskPhase } from '../utils/taskStatus'

const OTHER_CATEGORY = '__other__'
const DUE_FILTERS: TaskDueFilter[] = ['all', 'with-due', 'no-due', 'overdue', 'next-7-days']

function initialFilters(params: URLSearchParams): TaskFilters {
  const due = params.get('prazo') as TaskDueFilter | null
  return due && DUE_FILTERS.includes(due) ? { ...defaultTaskFilters, due } : defaultTaskFilters
}

type BoardNameDialog = { mode: 'create' | 'rename'; value: string } | null

export function BoardsPage() {
  const { boardId: routeBoardId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const appUser = useAuthStore((state) => state.appUser)
  const isOwner = appUser?.role === 'owner'
  const canCreateTask = Boolean(appUser?.organizationId)
  const { boards, loading: boardsLoading, error: boardsError, refetch: refetchBoards } = useBoards(
    appUser?.organizationId,
  )
  const [pendingBoardId, setPendingBoardId] = useState<string>()
  const activeBoardId =
    routeBoardId && boards.some((b) => b.id === routeBoardId)
      ? routeBoardId
      : boards[0]?.id ?? pendingBoardId
  const taskState = useTasks(appUser?.organizationId, activeBoardId)
  const activeBoard = boards.find((b) => b.id === activeBoardId)

  useEffect(() => {
    if (boardsLoading || !boards.length) return
    if (routeBoardId && boards.some((b) => b.id === routeBoardId)) return
    const query = searchParams.toString()
    navigate(`/boards/${boards[0].id}${query ? `?${query}` : ''}`, { replace: true })
  }, [boards, boardsLoading, routeBoardId, navigate, searchParams])

  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingBoard, setDeletingBoard] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [boardDialog, setBoardDialog] = useState<BoardNameDialog>(null)
  const [boardDialogSaving, setBoardDialogSaving] = useState(false)
  const [boardDialogError, setBoardDialogError] = useState('')
  const [boardActionError, setBoardActionError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categorySelect, setCategorySelect] = useState(OTHER_CATEGORY)
  const [customLabel, setCustomLabel] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [dueDate, setDueDate] = useState('')
  const [members, setMembers] = useState<AppUser[]>([])
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [assigneeId, setAssigneeId] = useState('')
  const [taskFilters, setTaskFilters] = useState<TaskFilters>(() => initialFilters(searchParams))
  const headerQuery = useHeaderSearchStore((s) => s.query)
  const setHeaderQuery = useHeaderSearchStore((s) => s.setQuery)

  useEffect(() => {
    setTaskFilters((prev) => (prev.query === headerQuery ? prev : { ...prev, query: headerQuery }))
  }, [headerQuery])

  function onFiltersChange(next: TaskFilters) {
    setTaskFilters(next)
    if (next.query !== headerQuery) setHeaderQuery(next.query)
  }

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
          setAssigneeId(
            resolveDefaultAssigneeId(membersData, appUser?.organizationId, appUser?.id),
          )
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

  function resetAssigneeField() {
    setAssigneeId(resolveDefaultAssigneeId(members, appUser?.organizationId, appUser?.id))
  }

  function openTaskModal() {
    setSubmitError('')
    resetCategoryFields()
    resetAssigneeField()
    setShowTaskModal(true)
  }

  function closeTaskModal() {
    setShowTaskModal(false)
    setSubmitError('')
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

    if (!assigneeId || !members.some((m) => m.id === assigneeId)) {
      setSubmitError('Selecione um responsável para a tarefa.')
      return
    }

    try {
      setIsSubmitting(true)
      let activeBoardIdForTask = activeBoardId
      if (!activeBoardIdForTask) {
        const created = await createBoard('Quadro principal', appUser.organizationId)
        activeBoardIdForTask = created.id
        setPendingBoardId(created.id)
        await refetchBoards()
        navigate(`/boards/${created.id}`)
      }
      const assignee = members.find((m) => m.id === assigneeId)
      await createTask({
        title: title.trim(),
        description: description.trim(),
        label: resolvedLabel,
        priority,
        dueDate: dueDate || undefined,
        assigneeName: assignee?.fullName,
        boardId: activeBoardIdForTask,
        organizationId: appUser.organizationId,
        assignedTo: assigneeId,
      })
      setLastAssigneeId(appUser.organizationId, assigneeId)
      await taskState.refetch()
      setTitle('')
      setDescription('')
      resetCategoryFields()
      setPriority('medium')
      setDueDate('')
      resetAssigneeField()
      setShowTaskModal(false)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Falha ao criar tarefa.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function onSubmitBoardDialog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!boardDialog || !appUser?.organizationId) return
    const name = boardDialog.value.trim()
    if (!name) {
      setBoardDialogError('Informe um nome para o quadro.')
      return
    }
    setBoardDialogSaving(true)
    setBoardDialogError('')
    try {
      if (boardDialog.mode === 'create') {
        const created = await createBoard(name, appUser.organizationId)
        await refetchBoards()
        navigate(`/boards/${created.id}`)
      } else if (activeBoardId && name !== activeBoard?.name) {
        await updateBoard(activeBoardId, name)
        await refetchBoards()
      }
      setBoardDialog(null)
    } catch (e) {
      setBoardDialogError(
        e instanceof Error
          ? e.message
          : boardDialog.mode === 'create'
            ? 'Falha ao criar quadro.'
            : 'Falha ao renomear quadro.',
      )
    } finally {
      setBoardDialogSaving(false)
    }
  }

  async function onDeleteBoard() {
    if (!activeBoardId || !isOwner) return
    setDeleteError('')
    setDeletingBoard(true)
    try {
      await deleteBoard(activeBoardId)
      setShowDeleteConfirm(false)
      await refetchBoards()
      navigate('/boards')
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Falha ao excluir quadro.')
    } finally {
      setDeletingBoard(false)
    }
  }

  async function onToggleFeatured() {
    if (!activeBoardId || !activeBoard || !isOwner) return
    setBoardActionError('')
    try {
      await updateBoardFeatured(activeBoardId, !activeBoard.featured)
      await refetchBoards()
    } catch (e) {
      setBoardActionError(e instanceof Error ? e.message : 'Falha ao atualizar destaque.')
    }
  }

  const boardMenuItems: MenuItem[] = activeBoard
    ? [
        {
          label: 'Renomear quadro',
          onSelect: () => {
            setBoardDialogError('')
            setBoardDialog({ mode: 'rename', value: activeBoard.name })
          },
        },
        ...(isOwner
          ? [
              {
                label: activeBoard.featured ? 'Remover destaque do dashboard' : 'Destacar no dashboard',
                onSelect: () => void onToggleFeatured(),
              },
              {
                label: 'Excluir quadro',
                tone: 'danger' as const,
                onSelect: () => {
                  setDeleteError('')
                  setShowDeleteConfirm(true)
                },
              },
            ]
          : []),
      ]
    : []

  return (
    <Layout searchPlaceholder="Buscar tarefas...">
      <PageHeader
        title="Quadros"
        subtitle="Kanban operacional da organização"
        className="mb-5"
        actions={
          <button
            type="button"
            onClick={openTaskModal}
            disabled={!canCreateTask || !activeBoardId}
            className={buttonClass.primary}
          >
            <span aria-hidden="true">+</span> Nova tarefa
          </button>
        }
      />

      {boardsError && (
        <ErrorBlock message={boardsError} onRetry={() => void refetchBoards()} className="mb-4" />
      )}
      {boardActionError && (
        <ErrorBlock message={boardActionError} onRetry={() => setBoardActionError('')} className="mb-4" />
      )}

      {boardsLoading ? (
        <LoadingBlock label="Carregando quadros..." className="mb-5" />
      ) : (
        <section className="mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
          <nav
            aria-label="Quadros"
            className="-mb-px flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
          >
            {boards.map((board) => {
              const active = board.id === activeBoardId
              return (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => navigate(`/boards/${board.id}`)}
                  aria-current={active ? 'page' : undefined}
                  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${
                    active
                      ? 'border-violet-600 text-violet-700 dark:border-violet-400 dark:text-violet-300'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {board.name}
                  {board.featured && (
                    <span className="ml-1 text-amber-500" title="Destacado no dashboard">
                      ★
                    </span>
                  )}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => {
                setBoardDialogError('')
                setBoardDialog({ mode: 'create', value: '' })
              }}
              className="shrink-0 whitespace-nowrap px-3 py-2 text-sm text-slate-500 hover:text-violet-700 dark:text-slate-400 dark:hover:text-violet-300"
            >
              + Novo quadro
            </button>
          </nav>
          {activeBoard && boardMenuItems.length > 0 && (
            <div className="mb-1 shrink-0">
              <DropdownMenu
                trigger={<IconDots />}
                triggerLabel={`Opções do quadro ${activeBoard.name}`}
                items={boardMenuItems}
              />
            </div>
          )}
        </section>
      )}

      <BoardTaskFilters
        filters={taskFilters}
        members={members}
        labelOptions={labelOptions}
        totalCount={taskState.all.length}
        filteredCount={filteredTasks.length}
        onChange={onFiltersChange}
      />

      {taskState.error && (
        <ErrorBlock message={taskState.error} onRetry={() => void taskState.refetch()} className="mb-4" />
      )}

      {taskState.loading ? (
        <LoadingBlock label="Carregando tarefas..." />
      ) : (
        <KanbanSection
          tasks={filteredGrouped}
          allTasks={filteredTasks}
          members={members}
          categories={categories}
          boards={boards}
          onLocalPatch={taskState.patchTaskLocal}
          onLocalRemove={taskState.removeTaskLocal}
          onRefetch={taskState.refetch}
        />
      )}

      <Modal
        open={showTaskModal}
        onClose={closeTaskModal}
        dismissible={!isSubmitting}
        size="lg"
        title="Nova tarefa"
        description="A tarefa será criada na coluna A fazer."
        footer={
          <>
            {submitError && <p className="mr-auto text-sm text-red-600 dark:text-red-400">{submitError}</p>}
            <button type="button" onClick={closeTaskModal} className={buttonClass.secondary}>
              Cancelar
            </button>
            <button type="submit" form="new-task-form" disabled={isSubmitting} className={buttonClass.primary}>
              {isSubmitting ? 'Criando...' : 'Criar tarefa'}
            </button>
          </>
        }
      >
        <form id="new-task-form" onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="new-task-title" className={labelClass}>
              Título
            </label>
            <input
              id="new-task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Ex: Implementar fluxo de convite"
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="new-task-description" className={labelClass}>
              Descrição
            </label>
            <textarea
              id="new-task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Descreva a tarefa com detalhes"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="new-task-category" className={labelClass}>
              Categoria
            </label>
            <select
              id="new-task-category"
              value={categorySelect}
              onChange={(e) => setCategorySelect(e.target.value)}
              className={inputClass}
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
                aria-label="Nome da categoria"
                className={`mt-2 ${inputClass}`}
              />
            )}
          </div>
          <div>
            <label htmlFor="new-task-priority" className={labelClass}>
              Prioridade
            </label>
            <select
              id="new-task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              className={inputClass}
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <div>
            <label htmlFor="new-task-assignee" className={labelClass}>
              Responsável <span className="text-red-500">*</span>
            </label>
            <select
              id="new-task-assignee"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              required
              className={inputClass}
            >
              {members.length === 0 && <option value="">Nenhum membro disponível</option>}
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName || member.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="new-task-due" className={labelClass}>
              Prazo
            </label>
            <input
              id="new-task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={boardDialog !== null}
        onClose={() => setBoardDialog(null)}
        dismissible={!boardDialogSaving}
        size="sm"
        title={boardDialog?.mode === 'rename' ? 'Renomear quadro' : 'Novo quadro'}
        footer={
          <>
            {boardDialogError && (
              <p className="mr-auto text-sm text-red-600 dark:text-red-400">{boardDialogError}</p>
            )}
            <button type="button" onClick={() => setBoardDialog(null)} className={buttonClass.secondary}>
              Cancelar
            </button>
            <button type="submit" form="board-name-form" disabled={boardDialogSaving} className={buttonClass.primary}>
              {boardDialogSaving ? 'Salvando...' : boardDialog?.mode === 'rename' ? 'Salvar' : 'Criar quadro'}
            </button>
          </>
        }
      >
        <form id="board-name-form" onSubmit={onSubmitBoardDialog}>
          <label htmlFor="board-name" className={labelClass}>
            Nome do quadro
          </label>
          <input
            id="board-name"
            value={boardDialog?.value ?? ''}
            onChange={(e) => setBoardDialog((prev) => (prev ? { ...prev, value: e.target.value } : prev))}
            placeholder="Ex: Marketing"
            className={inputClass}
          />
        </form>
      </Modal>

      <Modal
        open={showDeleteConfirm && Boolean(activeBoard)}
        onClose={() => {
          setShowDeleteConfirm(false)
          setDeleteError('')
        }}
        dismissible={!deletingBoard}
        role="alertdialog"
        size="sm"
        title="Excluir quadro?"
        footer={
          <>
            <button
              type="button"
              disabled={deletingBoard}
              onClick={() => {
                setShowDeleteConfirm(false)
                setDeleteError('')
              }}
              className={buttonClass.secondary}
              data-autofocus
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={deletingBoard}
              onClick={() => void onDeleteBoard()}
              className={buttonClass.danger}
            >
              {deletingBoard ? 'Excluindo...' : 'Sim, excluir quadro'}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Você está prestes a excluir o quadro{' '}
          <strong className="text-slate-900 dark:text-slate-100">{activeBoard?.name}</strong>. Todas as tarefas
          deste quadro serão removidas permanentemente. Esta ação não pode ser desfeita.
        </p>
        {deleteError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{deleteError}</p>}
      </Modal>
    </Layout>
  )
}
