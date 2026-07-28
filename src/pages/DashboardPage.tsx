import { Link } from 'react-router-dom'
import { useFavoriteTasks } from '../hooks/useFavoriteTasks'
import { Layout } from '../components/Layout'
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
  const favorites = useFavoriteTasks(appUser?.organizationId)
  const onlineUsers = useOnlineUsers(appUser?.organizationId)

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

      <section className="mt-7 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Atrasadas</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Prazos já vencidos</p>
            </div>
            <Link to="/boards" className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-400">
              Ver quadro
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
              Ver quadro
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

      <section className="mt-7">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold">Favoritos</h2>
          <p className="text-slate-500 dark:text-slate-400">Tarefas marcadas com estrela para acesso rápido.</p>
        </div>

        {favorites.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
            <p>Nenhuma tarefa favorita ainda.</p>
            <p className="mt-2 text-sm">
              Em <strong>Quadros</strong>, clique na estrela do card para destacar e ela aparecer aqui.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {favorites.map((task) => (
              <article
                key={task.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    ★ Favorita
                  </span>
                  {task.priority && (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {taskPriorityLabel(task.priority)}
                    </span>
                  )}
                </div>
                <h3 className="line-clamp-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {task.title}
                </h3>
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
                  to="/boards"
                  className="mt-3 inline-block text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
                >
                  Abrir no Kanban
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </Layout>
  )
}
