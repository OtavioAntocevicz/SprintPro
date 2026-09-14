import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { updateTaskFavorite } from '../services/apiData'
import { taskPriorityLabel } from '../utils/taskPriorityLabel'
import type { Task } from '../types'

type Props = {
  task: Task
  canFavorite: boolean
  onRemoved: () => void
  onSuccess: () => void
  onError: (message: string) => void
}

export function FavoriteTaskCard({ task, canFavorite, onRemoved, onSuccess, onError }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [removing, setRemoving] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuOpen])

  async function handleRemoveFavorite() {
    if (removing) return
    setMenuOpen(false)
    setRemoving(true)
    onRemoved()
    try {
      await updateTaskFavorite(task.id, false)
      onSuccess()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Não foi possível remover dos favoritos.')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          ★ Favorita
        </span>
        <div className="flex items-center gap-1.5">
          {task.priority && (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {taskPriorityLabel(task.priority)}
            </span>
          )}
          {canFavorite && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-label="Opções da tarefa"
                aria-expanded={menuOpen}
                disabled={removing}
                onClick={() => setMenuOpen((open) => !open)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <circle cx="12" cy="5" r="1.75" />
                  <circle cx="12" cy="12" r="1.75" />
                  <circle cx="12" cy="19" r="1.75" />
                </svg>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 z-10 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleRemoveFavorite()}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Remover dos favoritos
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <h3 className="line-clamp-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{task.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
        {task.description || 'Sem descrição'}
      </p>
      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        <p>
          {task.dueDate
            ? new Date(`${task.dueDate}T00:00:00`).toLocaleDateString('pt-BR')
            : 'Sem prazo'}
        </p>
      </div>
      <Link
        to={`/boards/${task.boardId}`}
        className="mt-3 inline-block text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
      >
        Abrir no Kanban
      </Link>
    </article>
  )
}
