import { useEffect, useState } from 'react'
import { updateTaskNotes } from '../services/apiData'
import type { Task } from '../types'

type Props = {
  task: Task | null
  open: boolean
  onClose: () => void
  onSaved: (taskId: string, notes: string) => void
}

export function TaskNotesModal({ task, open, onClose, onSaved }: Props) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && task) {
      setNotes(task.notes ?? '')
      setError('')
    }
  }, [open, task])

  if (!open || !task) return null

  async function onSave() {
    if (!task) return
    setSaving(true)
    setError('')
    try {
      await updateTaskNotes(task.id, notes)
      onSaved(task.id, notes)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar as anotações.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 dark:bg-black/60">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Anotações</h2>
            <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">{task.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            ✕
          </button>
        </div>

        {task.description && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Descrição
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{task.description}</p>
          </div>
        )}

        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Suas anotações
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={8}
          placeholder="Registre checkpoints, bloqueios, links ou o que precisar lembrar..."
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />

        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
