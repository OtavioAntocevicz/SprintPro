import { useEffect, useState, type FormEvent } from 'react'
import { updateTask } from '../services/apiData'
import type { AppUser, Task, TaskCategory } from '../types'

const OTHER_CATEGORY = '__other__'

type Props = {
  task: Task | null
  open: boolean
  members: AppUser[]
  categories: TaskCategory[]
  onClose: () => void
  onSaved: (task: Task) => void
}

function toPtBrDate(iso?: string) {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  if (!y || !m || !d) return ''
  return `${d}/${m}/${y}`
}

function parseDateFromPtBr(value: string) {
  const normalized = value.trim()
  if (!normalized) return null
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized)
  if (!match) return undefined
  const [, dd, mm, yyyy] = match
  const iso = `${yyyy}-${mm}-${dd}`
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return undefined
  if (
    date.getFullYear() !== Number(yyyy) ||
    date.getMonth() + 1 !== Number(mm) ||
    date.getDate() !== Number(dd)
  ) {
    return undefined
  }
  return iso
}

export function TaskEditModal({ task, open, members, categories, onClose, onSaved }: Props) {
  const [description, setDescription] = useState('')
  const [categorySelect, setCategorySelect] = useState(OTHER_CATEGORY)
  const [customLabel, setCustomLabel] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [dueDateInput, setDueDateInput] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !task) return
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
    setDueDateInput(toPtBrDate(task.dueDate))
    setAssigneeId(task.assignedTo ?? members[0]?.id ?? '')
    setError('')
  }, [open, task, categories, members])

  if (!open || !task) return null

  const showCustomLabel = categorySelect === OTHER_CATEGORY
  const taskId = task.id
  const taskTitle = task.title

  function onDueDateInputChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    let out = ''
    for (let i = 0; i < digits.length; i += 1) {
      if (i === 2 || i === 4) out += '/'
      out += digits[i]
    }
    setDueDateInput(out)
  }

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
    const parsedDue = dueDateInput ? parseDateFromPtBr(dueDateInput) : null
    if (dueDateInput && parsedDue === undefined) {
      setError('Data inválida. Use o formato dd/mm/aaaa.')
      return
    }

    setSaving(true)
    try {
      const updated = await updateTask(taskId, {
        description: description.trim(),
        label: resolvedLabel,
        priority,
        dueDate: parsedDue,
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 dark:bg-black/60">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Editar tarefa</h2>
            <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">{taskTitle}</p>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              O título não pode ser alterado. Atualize os demais campos e salve.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
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
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Responsável <span className="text-red-500">*</span>
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
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
          </div>

          <div className="mt-2 flex items-center justify-end gap-2 md:col-span-2">
            {error && <p className="mr-auto text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-slate-600 dark:border-slate-600 dark:text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-violet-600 px-4 py-2 text-white disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
