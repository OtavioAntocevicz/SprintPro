import { Link } from 'react-router-dom'
import { useFavoriteTasks } from '../hooks/useFavoriteTasks'
import { Layout } from '../components/Layout'
import { useOrgTaskStats } from '../hooks/useOrgTaskStats'
import { useAuthStore } from '../store/authStore'
import { taskPriorityLabel } from '../utils/taskPriorityLabel'

export function DashboardPage() {
  const appUser = useAuthStore((state) => state.appUser)
  const stats = useOrgTaskStats(appUser?.organizationId)
  const favorites = useFavoriteTasks(appUser?.organizationId)
  const activeTeam = 1

  return (
    <Layout searchPlaceholder="Buscar em boards...">
      <section>
        <h1 className="text-5xl font-semibold">Olá, {appUser?.fullName?.split(' ')[0] ?? 'Gestor'} !</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Aqui está o que está acontecendo no seu workspace hoje.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Tarefas ativas</p>
          <p className="mt-2 text-4xl font-bold">{stats.totalActiveTasks}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Próximos prazos</p>
          <p className="mt-2 text-4xl font-bold">{stats.upcomingDeadlines}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Equipe ativa</p>
          <p className="mt-2 text-4xl font-bold">{activeTeam}</p>
        </article>
      </section>

      <section className="mt-7">
        <div className="mb-4">
          <h2 className="text-3xl font-semibold">Favoritos</h2>
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
                <article key={task.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">★ Favorita</span>
                    {task.priority && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {taskPriorityLabel(task.priority)}
                      </span>
                    )}
                  </div>
                  <h3 className="line-clamp-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{task.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{task.description || 'Sem descrição'}</p>
                  <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    <p>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : 'Sem prazo'}</p>
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
