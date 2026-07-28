import { useCallback, useEffect, useMemo, useState } from 'react'
import { Layout } from '../components/Layout'
import { TaskNotesModal } from '../components/TaskNotesModal'
import { useMembersCount } from '../hooks/useMembersCount'
import { deleteTask, fetchCategories, fetchCompletedTasks } from '../services/apiData'
import { useAuthStore } from '../store/authStore'
import { useHeaderSearchStore } from '../store/headerSearchStore'
import { pollIntervalForMemberCount } from '../utils/pollInterval'
import { taskPriorityLabel } from '../utils/taskPriorityLabel'
import type { Task, TaskCategory } from '../types'

type CompletedSort = 'completed-desc' | 'completed-asc' | 'title-asc' | 'title-desc'
type NotesFilter = 'all' | 'with-notes' | 'without-notes'

type CompletedFilters = {
  query: string
  label: string
  notes: NotesFilter
  sort: CompletedSort
}

const defaultFilters: CompletedFilters = {
  query: '',
  label: '',
  notes: 'all',
  sort: 'completed-desc',
}

const selectClass =
  'min-w-[7rem] rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-7 text-sm font-medium text-slate-900 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'

function formatCompletedAt(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR')
}

function completedTime(task: Task) {
  if (!task.completedAt) return 0
  const t = new Date(task.completedAt).getTime()
  return Number.isFinite(t) ? t : 0
}

export function CompletedPage() {
  const appUser = useAuthStore((s) => s.appUser)
  const isOwner = appUser?.role === 'owner'
  const memberCount = useMembersCount(appUser?.organizationId)
  const pollMs = pollIntervalForMemberCount(memberCount)
  const headerQuery = useHeaderSearchStore((s) => s.query)
  const setHeaderQuery = useHeaderSearchStore((s) => s.setQuery)
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [notesTask, setNotesTask] = useState<Task | null>(null)
  const [filters, setFilters] = useState<CompletedFilters>(defaultFilters)

  useEffect(() => {
    setFilters((prev) => (prev.query === headerQuery ? prev : { ...prev, query: headerQuery }))
  }, [headerQuery])

  const load = useCallback(async () => {
    if (!appUser?.organizationId) return
    try {
      const [data, cats] = await Promise.all([fetchCompletedTasks(), fetchCategories()])
      setTasks(data)
      setCategories(cats)
    } catch (e) {
      console.error(e)
      setFeedback(e instanceof Error ? e.message : 'Não foi possível carregar o histórico.')
    } finally {
      setLoading(false)
    }
  }, [appUser?.organizationId])

  useEffect(() => {
    void load()
    const id = window.setInterval(() => void load(), pollMs)
    return () => window.clearInterval(id)
  }, [load, pollMs])

  const labelOptions = useMemo(() => {
    const names = new Set<string>()
    for (const category of categories) {
      if (category.name.trim()) names.add(category.name.trim())
    }
    for (const task of tasks) {
      const label = task.label?.trim()
      if (label) names.add(label)
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [categories, tasks])

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    let result = tasks.filter((task) => {
      if (q) {
        const inTitle = task.title.toLowerCase().includes(q)
        const inDescription = task.description?.toLowerCase().includes(q)
        const inLabel = task.label?.toLowerCase().includes(q)
        const inAssignee = task.assigneeName?.toLowerCase().includes(q)
        if (!inTitle && !inDescription && !inLabel && !inAssignee) return false
      }
      if (filters.label && (task.label ?? '') !== filters.label) return false
      const notesCount = task.notesCount ?? 0
      if (filters.notes === 'with-notes' && notesCount <= 0) return false
      if (filters.notes === 'without-notes' && notesCount > 0) return false
      return true
    })

    result = [...result]
    switch (filters.sort) {
      case 'completed-asc':
        result.sort((a, b) => completedTime(a) - completedTime(b))
        break
      case 'title-asc':
        result.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
        break
      case 'title-desc':
        result.sort((a, b) => b.title.localeCompare(a.title, 'pt-BR'))
        break
      case 'completed-desc':
      default:
        result.sort((a, b) => completedTime(b) - completedTime(a))
        break
    }
    return result
  }, [tasks, filters])

  const filtersActive =
    filters.query.trim() !== '' ||
    filters.label !== '' ||
    filters.notes !== 'all' ||
    filters.sort !== 'completed-desc'

  function patchFilters(partial: Partial<CompletedFilters>) {
    setFilters((prev) => {
      const next = { ...prev, ...partial }
      if (partial.query !== undefined && partial.query !== headerQuery) {
        setHeaderQuery(partial.query)
      }
      return next
    })
  }

  async function onDelete(task: Task) {
    if (!isOwner) return
    const ok = window.confirm(`Excluir permanentemente a tarefa "${task.title}"?`)
    if (!ok) return
    setDeletingId(task.id)
    setFeedback('')
    try {
      await deleteTask(task.id)
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
      if (notesTask?.id === task.id) setNotesTask(null)
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Não foi possível excluir a tarefa.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Layout searchPlaceholder="Buscar em concluídos...">
      <section className="mb-6">
        <h1 className="text-4xl font-semibold tracking-tight">Concluídos</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Histórico de tarefas finalizadas. No quadro, concluídas ficam visíveis por 24 horas.
        </p>
      </section>

      <section className="mb-5">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
          <span className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Filtros</span>
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

          <label className="flex min-w-[12rem] flex-1 items-center gap-1.5 rounded-lg px-2">
            <span className="text-xs text-slate-400">Título/texto</span>
            <input
              type="search"
              value={filters.query}
              onChange={(e) => patchFilters({ query: e.target.value })}
              placeholder="Buscar..."
              className="w-full min-w-[8rem] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label className="flex items-center gap-1.5 rounded-lg px-2">
            <span className="text-xs text-slate-400">Categoria</span>
            <select
              value={filters.label}
              onChange={(e) => patchFilters({ label: e.target.value })}
              className={selectClass}
            >
              <option value="">Todas</option>
              {labelOptions.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 rounded-lg px-2">
            <span className="text-xs text-slate-400">Anotações</span>
            <select
              value={filters.notes}
              onChange={(e) => patchFilters({ notes: e.target.value as NotesFilter })}
              className={selectClass}
            >
              <option value="all">Todas</option>
              <option value="with-notes">Com anotações</option>
              <option value="without-notes">Sem anotações</option>
            </select>
          </label>

          <label className="flex items-center gap-1.5 rounded-lg px-2">
            <span className="text-xs text-slate-400">Ordenar</span>
            <select
              value={filters.sort}
              onChange={(e) => patchFilters({ sort: e.target.value as CompletedSort })}
              className={selectClass}
            >
              <option value="completed-desc">Concluídas (mais recentes)</option>
              <option value="completed-asc">Concluídas (mais antigas)</option>
              <option value="title-asc">Alfabética (A–Z)</option>
              <option value="title-desc">Alfabética (Z–A)</option>
            </select>
          </label>

          <div className="ml-auto flex items-center gap-3">
            {filtersActive && (
              <button
                type="button"
                onClick={() => {
                  setFilters(defaultFilters)
                  setHeaderQuery('')
                }}
                className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
              >
                Limpar
              </button>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {filtered.length === tasks.length
                ? `${tasks.length} concluída${tasks.length === 1 ? '' : 's'}`
                : `${filtered.length} de ${tasks.length}`}
            </p>
          </div>
        </div>
      </section>

      {feedback && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {feedback}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Carregando histórico...</p>
      ) : filtered.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
          <p>
            {tasks.length === 0
              ? 'Nenhuma tarefa concluída ainda.'
              : 'Nenhuma tarefa encontrada com esses filtros.'}
          </p>
          {tasks.length === 0 && (
            <p className="mt-2 text-sm">
              Quando uma tarefa for movida para Concluído, ela aparece aqui no histórico.
            </p>
          )}
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="hidden grid-cols-12 gap-3 border-b border-slate-200 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid dark:border-slate-700 dark:text-slate-400">
            <p className="col-span-4">Tarefa</p>
            <p className="col-span-2">Categoria</p>
            <p className="col-span-2">Responsável</p>
            <p className="col-span-2">Concluída em</p>
            <p className="col-span-2 text-right">Ações</p>
          </div>
          <ul>
            {filtered.map((task) => {
              const hasNotes = (task.notesCount ?? 0) > 0
              return (
                <li
                  key={task.id}
                  className="grid gap-2 border-b border-slate-100 px-5 py-4 last:border-0 md:grid-cols-12 md:items-center md:gap-3 dark:border-slate-800"
                >
                  <div className="md:col-span-4">
                    <button
                      type="button"
                      onClick={() => setNotesTask(task)}
                      className="text-left"
                      title="Ver anotações"
                    >
                      <p className="font-medium text-slate-900 hover:text-violet-700 dark:text-slate-100 dark:hover:text-violet-300">
                        {task.title}
                      </p>
                    </button>
                    {task.priority && (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {taskPriorityLabel(task.priority)}
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 md:col-span-2 dark:text-slate-300">
                    {task.label || '—'}
                  </p>
                  <p className="text-sm text-slate-600 md:col-span-2 dark:text-slate-300">
                    {task.assigneeName || '—'}
                  </p>
                  <p className="text-sm text-slate-500 md:col-span-2 dark:text-slate-400">
                    {formatCompletedAt(task.completedAt)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 md:col-span-2 md:justify-end">
                    <button
                      type="button"
                      onClick={() => setNotesTask(task)}
                      title={hasNotes ? 'Ver anotações' : 'Adicionar anotações'}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                        hasNotes
                          ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      Anotações
                    </button>
                    {isOwner && (
                      <button
                        type="button"
                        disabled={deletingId === task.id}
                        onClick={() => void onDelete(task)}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 disabled:opacity-60 dark:bg-red-950 dark:text-red-400"
                      >
                        {deletingId === task.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <TaskNotesModal
        task={notesTask}
        open={notesTask !== null}
        onClose={() => setNotesTask(null)}
        onNotesCountChange={(taskId, notesCount) => {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, notesCount } : t)))
          setNotesTask((prev) => (prev?.id === taskId ? { ...prev, notesCount } : prev))
        }}
      />
    </Layout>
  )
}
