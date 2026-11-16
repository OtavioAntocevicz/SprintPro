import { useEffect, useState, type FormEvent } from 'react'
import { updateTask } from '../services/apiData'
import type { AppUser, Task, TaskCategory } from '../types'
import { Modal } from './ui'
import { buttonClass, inputClass, labelClass } from './uiStyles'

const OTHER_CATEGORY = '__other__'

type Props = {
  task: Task | null
  open: boolean
  members: AppUser[]
  categories: TaskCategory[]
  onClose: () => void
  onSaved: (task: Task) => void
}

export function TaskEditModal({ task, open, members, categories, onClose, onSaved }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categorySelect, setCategorySelect] = useState(OTHER_CATEGORY)
  const [customLabel, setCustomLabel] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [dueDate, setDueDate] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [saving, setSaving] = useState(false)
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
    setError('')
  }, [open, task, categories, members])

  if (!open || !task) return null

  const showCustomLabel = categorySelect === OTHER_CATEGORY
  const taskId = task.id

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
      })
      onSaved(updated)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a tarefa.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!saving}
      size="lg"
      title="Editar tarefa"
      description="Atualize os campos e salve as alterações."
      footer={
        <>
          {error && <p className="mr-auto text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button type="button" onClick={onClose} className={buttonClass.secondary}>
            Cancelar
          </button>
          <button type="submit" form="edit-task-form" disabled={saving} className={buttonClass.primary}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </>
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
      </form>
    </Modal>
  )
}
