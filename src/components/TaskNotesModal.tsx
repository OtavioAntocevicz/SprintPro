import { useEffect, useState } from 'react'
import { addTaskNote, deleteTaskNote, fetchTaskNotes } from '../services/apiData'
import { useAuthStore } from '../store/authStore'
import type { Task, TaskNote } from '../types'
import { Avatar, Modal } from './ui'
import { buttonClass, inputClass, labelClass } from './uiStyles'

type Props = {
  task: Task | null
  open: boolean
  onClose: () => void
  onNotesCountChange: (taskId: string, notesCount: number) => void
}

function formatNoteDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR')
}

export function TaskNotesModal({ task, open, onClose, onNotesCountChange }: Props) {
  const appUser = useAuthStore((s) => s.appUser)
  const [notes, setNotes] = useState<TaskNote[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !task) return
    setDraft('')
    setError('')
    setLoading(true)
    let cancelled = false
    void (async () => {
      try {
        const data = await fetchTaskNotes(task.id)
        if (!cancelled) setNotes(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Não foi possível carregar as anotações.')
          setNotes([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, task])

  if (!open || !task) return null

  const taskId = task.id
  const taskTitle = task.title
  const taskDescription = task.description
  const isOwner = appUser?.role === 'owner'

  function canDeleteNote(note: TaskNote) {
    if (!appUser) return false
    if (isOwner) return true
    return note.authorId === appUser.id
  }

  async function onAdd() {
    const content = draft.trim()
    if (!content) return
    setAdding(true)
    setError('')
    try {
      const created = await addTaskNote(taskId, content)
      setNotes((prev) => [created, ...prev])
      setDraft('')
      onNotesCountChange(taskId, notes.length + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível adicionar a anotação.')
    } finally {
      setAdding(false)
    }
  }

  async function onDelete(note: TaskNote) {
    const ok = window.confirm('Excluir esta anotação?')
    if (!ok) return
    setDeletingId(note.id)
    setError('')
    try {
      await deleteTaskNote(taskId, note.id)
      setNotes((prev) => prev.filter((n) => n.id !== note.id))
      onNotesCountChange(taskId, Math.max(0, notes.length - 1))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível excluir a anotação.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title="Anotações"
      description={<span className="font-medium text-slate-700 dark:text-slate-300">{taskTitle}</span>}
      footer={
        <button type="button" onClick={onClose} className={buttonClass.secondary}>
          Fechar
        </button>
      }
    >
      {taskDescription && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Descrição</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{taskDescription}</p>
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="task-note-draft" className={labelClass}>
          Nova anotação
        </label>
        <textarea
          id="task-note-draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              void onAdd()
            }
          }}
          rows={3}
          placeholder="Registre um checkpoint, bloqueio, link ou observação..."
          className={inputClass}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-400">Ctrl+Enter para adicionar</span>
          <button
            type="button"
            onClick={() => void onAdd()}
            disabled={adding || !draft.trim()}
            className={buttonClass.primary}
          >
            {adding ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Histórico</p>
      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Carregando anotações...</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma anotação registrada ainda.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
            >
              <Avatar name={note.authorName} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    <strong className="font-semibold text-slate-700 dark:text-slate-200">{note.authorName}</strong> ·{' '}
                    {formatNoteDate(note.createdAt)}
                  </span>
                  {canDeleteNote(note) && (
                    <button
                      type="button"
                      onClick={() => void onDelete(note)}
                      disabled={deletingId === note.id}
                      className="text-red-600 hover:underline disabled:opacity-60 dark:text-red-400"
                    >
                      {deletingId === note.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{note.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
