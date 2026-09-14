import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '../components/AsyncState'
import { FavoriteTaskCard } from '../components/FavoriteTaskCard'
import { Layout } from '../components/Layout'
import { useFavoriteTasks } from '../hooks/useFavoriteTasks'
import { useBoards } from '../hooks/useBoards'
import { useOrgTaskStats } from '../hooks/useOrgTaskStats'
import { useOnlineUsers } from '../hooks/useOnlineUsers'
import { useAuthStore } from '../store/authStore'
import { taskPriorityLabel } from '../utils/taskPriorityLabel'
import type { Task } from '../types'

function DueTaskRow({ task, tone }: { task: Task; tone: 'overdue' | 'upcoming' }) {
  return (
    <article className="flex items-start justify-between gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900 dark:text-slate-100">{task.title}</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {task.assigneeName ?? 'Sem responsável'}
          {task.label ? ` · ${task.label}` : ''}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={`text-sm font-semibold ${
            tone === 'overdue'
              ? 'text-red-600 dark:text-red-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {task.dueDate
            ? new Date(`${task.dueDate}T00:00:00`).toLocaleDateString('pt-BR')
            : '—'}
        </p>
        {task.priority && (
          <p className="text-[11px] text-slate-400">{taskPriorityLabel(task.priority)}</p>
        )}
      </div>
    </article>
  )
}

export function DashboardPage() {
  const appUser = useAuthStore((state) => state.appUser)
  const stats = useOrgTaskStats(appUser?.organizationId)
  const { favorites, loading: favLoading, error: favError, refetch: refetchFav } = useFavoriteTasks(
    appUser?.organizationId,
  )
  const { boards, loading: boardsLoading } = useBoards(appUser?.organizationId)
  const onlineUsers = useOnlineUsers(appUser?.organizationId)
  const [hiddenFavoriteIds, setHiddenFavoriteIds] = useState<Set<string>>(() => new Set())
  const [favoriteActionError, setFavoriteActionError] = useState('')

  const canFavorite = appUser?.role === 'owner' || Boolean(appUser?.canFavorite)
  const visibleFavorites = useMemo(
    () => favorites.filter((task) => !hiddenFavoriteIds.has(task.id)),
    [favorites, hiddenFavoriteIds],
  )

  const handleFavoriteRemoved = useCallback((taskId: string) => {
    setFavoriteActionError('')
    setHiddenFavoriteIds((prev) => new Set(prev).add(taskId))
  }, [])

  const handleFavoriteRemoveSuccess = useCallback(() => {
    void refetchFav()
  }, [refetchFav])

  const handleFavoriteRemoveError = useCallback((taskId: string, message: string) => {
    setHiddenFavoriteIds((prev) => {
      const next = new Set(prev)
      next.delete(taskId)
      return next
    })
    setFavoriteActionError(message)
  }, [])

  const featuredBoards = boards.filter((b) => b.featured)
  const quickBoards = featuredBoards.length > 0 ? featuredBoards : boards.slice(0, 3)

  return (
    <Layout searchPlaceholder="Buscar tarefas...">
      <section>
        <h1 className="text-4xl font-semibold tracking-tight">
          Olá, {appUser?.fullName?.split(' ')[0] ?? 'Gestor'}
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Resumo do workspace e prazos que pedem atenção.
        </p>
      </section>

      {stats.error && (
        <div className="mt-4">
          <ErrorBlock message={stats.error} onRetry={() => void stats.refetch()} />
        </div>
      )}

      {stats.loading ? (
        <div className="mt-6">
          <LoadingBlock label="Carregando resumo..." />
        </div>
      ) : (
        <>
          <section className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Tarefas ativas</p>
              <p className="mt-2 text-4xl font-bold">{stats.totalActiveTasks}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Próximos 7 dias</p>
              <p className="mt-2 text-4xl font-bold">{stats.upcomingDeadlines}</p>
              {stats.overdueCount > 0 && (
                <p className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
                  {stats.overdueCount} atrasada{stats.overdueCount === 1 ? '' : 's'}
                </p>
              )}
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Online agora</p>
              <p className="mt-2 text-4xl font-bold">{onlineUsers.length}</p>
            </article>
          </section>

          {!boardsLoading && quickBoards.length > 0 && (
            <section className="mt-7">
              <h2 className="text-lg font-semibold">Quadros</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {quickBoards.map((board) => (
                  <Link
                    key={board.id}
                    to={`/boards/${board.id}`}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-violet-700 hover:border-violet-300 dark:border-slate-700 dark:bg-slate-900 dark:text-violet-300"
                  >
                    {board.name}
                    {board.featured ? ' ★' : ''}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mt-7 grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Atrasadas</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Prazos já vencidos</p>
                </div>
                <Link to="/boards" className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-400">
                  Ver quadros
                </Link>
              </div>
              {stats.overdueTasks.length === 0 ? (
                <p className="py-6 text-sm text-slate-500 dark:text-slate-400">Nenhuma tarefa atrasada.</p>
              ) : (
                <div>
                  {stats.overdueTasks.slice(0, 6).map((task) => (
                    <DueTaskRow key={task.id} task={task} tone="overdue" />
                  ))}
                </div>
              )}
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Próximos prazos</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Nos próximos 7 dias</p>
                </div>
                <Link to="/boards" className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-400">
                  Ver quadros
                </Link>
              </div>
              {stats.upcomingTasks.length === 0 ? (
                <p className="py-6 text-sm text-slate-500 dark:text-slate-400">Nenhum prazo nos próximos 7 dias.</p>
              ) : (
                <div>
                  {stats.upcomingTasks.slice(0, 6).map((task) => (
                    <DueTaskRow key={task.id} task={task} tone="upcoming" />
                  ))}
                </div>
              )}
            </article>
          </section>
        </>
      )}

      <section className="mt-7">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold">Favoritos</h2>
          <p className="text-slate-500 dark:text-slate-400">Tarefas marcadas com estrela para acesso rápido.</p>
        </div>

        {favError && <ErrorBlock message={favError} onRetry={() => void refetchFav()} className="mb-4" />}
        {favoriteActionError && (
          <ErrorBlock message={favoriteActionError} onRetry={() => setFavoriteActionError('')} className="mb-4" />
        )}
        {favLoading ? (
          <LoadingBlock label="Carregando favoritos..." />
        ) : visibleFavorites.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
            <p>Nenhuma tarefa favorita ainda.</p>
            <p className="mt-2 text-sm">
              Em <strong>Quadros</strong>, clique na estrela do card para destacar e ela aparecer aqui.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleFavorites.map((task) => (
              <FavoriteTaskCard
                key={task.id}
                task={task}
                canFavorite={canFavorite}
                onRemoved={() => handleFavoriteRemoved(task.id)}
                onSuccess={handleFavoriteRemoveSuccess}
                onError={(message) => handleFavoriteRemoveError(task.id, message)}
              />
            ))}
          </div>
        )}
      </section>
    </Layout>
  )
}
