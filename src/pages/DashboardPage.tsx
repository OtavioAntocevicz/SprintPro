import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '../components/AsyncState'
import { FavoriteTaskCard } from '../components/FavoriteTaskCard'
import { Layout } from '../components/Layout'
import { useFavoriteTasks } from '../hooks/useFavoriteTasks'
import { useBoards } from '../hooks/useBoards'
import { useOrgTaskStats } from '../hooks/useOrgTaskStats'
import { useAuthStore } from '../store/authStore'
import { taskPriorityLabel } from '../utils/taskPriorityLabel'
import type { Task } from '../types'
import { Avatar, PageHeader, SectionTitle } from '../components/ui'
import { cardClass } from '../components/uiStyles'
import { formatDueDate } from '../utils/taskDue'

function DueTaskRow({ task, tone }: { task: Task; tone: 'overdue' | 'upcoming' }) {
  return (
    <article className="flex items-start justify-between gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
      <div className="flex min-w-0 items-start gap-2.5">
        <Avatar name={task.assigneeName} size="md" className="mt-0.5" />
        <div className="min-w-0">
        <p className="truncate font-medium text-slate-900 dark:text-slate-100">{task.title}</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {task.assigneeName ?? 'Sem responsável'}
          {task.label ? ` · ${task.label}` : ''}
        </p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={`text-sm font-semibold ${
            tone === 'overdue'
              ? 'text-red-600 dark:text-red-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {formatDueDate(task.dueDate)}
        </p>
        {task.priority && (
          <p className="text-[11px] text-slate-400">{taskPriorityLabel(task.priority)}</p>
        )}
      </div>
    </article>
  )
}

const STAT_TONES = {
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
} as const

function StatCard({
  to,
  label,
  value,
  tone,
  icon,
  extra,
}: {
  to: string
  label: string
  value: number
  tone: keyof typeof STAT_TONES
  icon: React.ReactNode
  extra?: React.ReactNode
}) {
  return (
    <article className={`${cardClass} relative transition hover:border-violet-300 hover:shadow-sm dark:hover:border-violet-700`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <Link to={to} className="after:absolute after:inset-0 focus:outline-none">
              {label}
            </Link>
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${STAT_TONES[tone]}`} aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {icon}
          </svg>
        </span>
      </div>
      {extra && <div className="relative z-10">{extra}</div>}
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
      <PageHeader
        className="mb-0"
        title={`Olá, ${appUser?.fullName?.split(' ')[0] ?? 'Gestor'}`}
        subtitle="Resumo do workspace e prazos que pedem atenção."
      />

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
            <StatCard
              to="/boards"
              label="Tarefas ativas"
              value={stats.totalActiveTasks}
              tone="violet"
              icon={<path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />}
            />
            <StatCard
              to="/boards?prazo=next-7-days"
              label="Próximos 7 dias"
              value={stats.upcomingDeadlines}
              tone="amber"
              icon={
                <>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </>
              }
              extra={
                stats.overdueCount > 0 ? (
                  <Link
                    to="/boards?prazo=overdue"
                    className="mt-1 inline-block text-sm font-medium text-red-600 hover:underline dark:text-red-400"
                  >
                    {stats.overdueCount} atrasada{stats.overdueCount === 1 ? '' : 's'}
                  </Link>
                ) : null
              }
            />
            <StatCard
              to="/boards"
              label="Em progresso"
              value={stats.inProgressCount}
              tone="emerald"
              icon={<path d="M22 12h-4l-3 9L9 3l-3 9H2" />}
            />
          </section>

          {!boardsLoading && quickBoards.length > 0 && (
            <section className="mt-7">
              <SectionTitle title="Quadros" />
              <div className="flex flex-wrap gap-2">
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
            <article className={cardClass}>
              <SectionTitle
                title="Atrasadas"
                subtitle="Prazos já vencidos"
                action={
                  <Link
                    to="/boards?prazo=overdue"
                    className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
                  >
                    Ver todas
                  </Link>
                }
              />
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

            <article className={cardClass}>
              <SectionTitle
                title="Próximos prazos"
                subtitle="Nos próximos 7 dias"
                action={
                  <Link
                    to="/boards?prazo=next-7-days"
                    className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
                  >
                    Ver todas
                  </Link>
                }
              />
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
        <SectionTitle title="Favoritos" subtitle="Tarefas marcadas com estrela para acesso rápido." />

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
