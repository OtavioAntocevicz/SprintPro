import { useEffect, useState, type FormEvent } from 'react'
import { deleteTask, updateTask } from '../services/apiData'
import type { AppUser, Board, Task, TaskCategory } from '../types'
import { Modal } from './ui'
import { buttonClass, inputClass, labelClass } from './uiStyles'

const OTHER_CATEGORY = '__other__'

type Props = {
  task: Task | null
  open: boolean
  members: AppUser[]
  categories: TaskCategory[]
  /** Quadros da organização; com mais de um, aparece o campo "Quadro" para mover a tarefa. */
  boards?: Board[]
  onClose: () => void
  onSaved: (task: Task) => void
  /** Exibe a lixeira (a API só permite exclusão pelo gestor). */
  canDelete?: boolean
  onDeleted?: (taskId: string) => void
}

export function TaskEditModal({
  task,
  open,
  members,
  categories,
  boards = [],
  onClose,
  onSaved,
  canDelete = false,
  onDeleted,
}: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categorySelect, setCategorySelect] = useState(OTHER_CATEGORY)
  const [customLabel, setCustomLabel] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [dueDate, setDueDate] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [boardId, setBoardId] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !task) return
    setTitle(task.title ?? '')
    setDescription(task.description ?? '')
    const label = task.label?.trim() ?? ''
    const known = categories.find((c) => c.name === label)
    if (known) {
      setCategorySelect(known.name)
      setCustomLabel('')
    } else if (label) {
      setCategorySelect(OTHER_CATEGORY)
      setCustomLabel(label)
    } else {
      setCategorySelect(categories[0]?.name ?? OTHER_CATEGORY)
      setCustomLabel('')
    }
    setPriority(task.priority ?? 'medium')
    setDueDate(task.dueDate?.slice(0, 10) ?? '')
    setAssigneeId(task.assignedTo ?? members[0]?.id ?? '')
    setBoardId(task.boardId)
    setError('')
    setConfirmDelete(false)
  }, [open, task, categories, members])

  if (!open || !task) return null

  const showCustomLabel = categorySelect === OTHER_CATEGORY
  const taskId = task.id
  const showBoardField = boards.length > 1
  const boardChanged = Boolean(boardId) && boardId !== task.boardId
  const targetBoardName = boards.find((b) => b.id === boardId)?.name

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    const resolvedLabel =
      categorySelect === OTHER_CATEGORY ? customLabel.trim() : categorySelect.trim()
    if (!resolvedLabel) {
      setError(
        categorySelect === OTHER_CATEGORY
          ? 'Informe a categoria em Outros.'
          : 'Selecione uma categoria.',
      )
      return
    }
    if (!assigneeId) {
      setError('Selecione um responsável.')
      return
    }
    if (!title.trim()) {
      setError('Informe um título.')
      return
    }

    setSaving(true)
    try {
      const updated = await updateTask(taskId, {
        title: title.trim(),
        description: description.trim(),
        label: resolvedLabel,
        priority,
        dueDate: dueDate || null,
        assignedTo: assigneeId,
        assigneeName: members.find((m) => m.id === assigneeId)?.fullName,
        ...(boardChanged ? { boardId } : {}),
      })
      onSaved(updated)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a tarefa.')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    setError('')
    setDeleting(true)
    try {
      await deleteTask(taskId)
      onDeleted?.(taskId)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível excluir a tarefa.')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  const busy = saving || deleting

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!busy}
      size="lg"
      title="Editar tarefa"
      description="Atualize os campos e salve as alterações."
      footer={
        confirmDelete ? (
          <>
            <p className="mr-auto text-sm font-medium text-red-700 dark:text-red-300">
              Excluir esta tarefa e suas anotações? Não dá para desfazer.
            </p>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className={buttonClass.secondary}
            >
              Não
            </button>
            <button type="button" onClick={() => void onDelete()} disabled={deleting} className={buttonClass.danger}>
              {deleting ? 'Excluindo...' : 'Sim, excluir'}
            </button>
          </>
        ) : (
          <>
            {canDelete && (
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setConfirmDelete(true)
                }}
                disabled={busy}
                title="Excluir tarefa"
                aria-label="Excluir tarefa"
                className="mr-auto grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-red-950/50 dark:hover:text-red-400"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
                </svg>
              </button>
            )}
            {error && (
              <p className={`text-sm text-red-600 dark:text-red-400 ${canDelete ? '' : 'mr-auto'}`}>{error}</p>
            )}
            <button type="button" onClick={onClose} disabled={busy} className={buttonClass.secondary}>
              Cancelar
            </button>
            <button type="submit" form="edit-task-form" disabled={busy} className={buttonClass.primary}>
              {saving ? (boardChanged ? 'Movendo...' : 'Salvando...') : boardChanged ? 'Salvar e mover' : 'Salvar'}
            </button>
          </>
        )
      }
    >
      <form id="edit-task-form" onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="edit-task-title" className={labelClass}>
            Título
          </label>
          <input
            id="edit-task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="edit-task-description" className={labelClass}>
            Descrição
          </label>
          <textarea
            id="edit-task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="edit-task-category" className={labelClass}>
            Categoria
          </label>
          <select
            id="edit-task-category"
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
          <label htmlFor="edit-task-priority" className={labelClass}>
            Prioridade
          </label>
          <select
            id="edit-task-priority"
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
          <label htmlFor="edit-task-assignee" className={labelClass}>
            Responsável <span className="text-red-500">*</span>
          </label>
          <select
            id="edit-task-assignee"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            required
            className={inputClass}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.fullName || member.email}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="edit-task-due" className={labelClass}>
            Prazo
          </label>
          <input
            id="edit-task-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputClass}
          />
        </div>
        {showBoardField && (
          <div>
            <label htmlFor="edit-task-board" className={labelClass}>
              Quadro
            </label>
            <select
              id="edit-task-board"
              value={boardId}
              onChange={(e) => setBoardId(e.target.value)}
              className={inputClass}
            >
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                  {board.id === task.boardId ? ' (atual)' : ''}
                </option>
              ))}
            </select>
            {boardChanged && (
              <p className="mt-1.5 text-xs text-violet-700 dark:text-violet-300">
                Ao salvar, a tarefa vai para <strong>{targetBoardName}</strong> mantendo coluna, anotações e
                favorito.
              </p>
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}
