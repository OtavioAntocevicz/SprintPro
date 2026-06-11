import type { AppUser } from '../types'
import {
  defaultTaskFilters,
  hasActiveFilters,
  type TaskFilters,
} from '../utils/filterTasks'

type Props = {
  filters: TaskFilters
  members: AppUser[]
  totalCount: number
  filteredCount: number
  onChange: (filters: TaskFilters) => void
}

const inputClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'

export function BoardTaskFilters({ filters, members, totalCount, filteredCount, onChange }: Props) {
  function patch(partial: Partial<TaskFilters>) {
    onChange({ ...filters, ...partial })
  }

  return (
    <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Buscar por título
          </label>
          <input
            type="search"
            value={filters.query}
            onChange={(e) => patch({ query: e.target.value })}
            placeholder="Nome da tarefa..."
            className={`w-full ${inputClass}`}
          />
        </div>

        <div className="min-w-[10rem]">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Responsável
          </label>
          <select
            value={filters.assigneeId}
            onChange={(e) => patch({ assigneeId: e.target.value })}
            className={`w-full ${inputClass}`}
          >
            <option value="">Todos</option>
            <option value="unassigned">Sem responsável</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.fullName || member.email}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[10rem]">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Prazo
          </label>
          <select
            value={filters.due}
            onChange={(e) => patch({ due: e.target.value as TaskFilters['due'] })}
            className={`w-full ${inputClass}`}
          >
            <option value="all">Todos</option>
            <option value="with-due">Com prazo</option>
            <option value="no-due">Sem prazo</option>
            <option value="overdue">Atrasadas</option>
            <option value="next-7-days">Próximos 7 dias</option>
          </select>
        </div>

        <div className="min-w-[10rem]">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Prioridade
          </label>
          <select
            value={filters.priority}
            onChange={(e) => patch({ priority: e.target.value as TaskFilters['priority'] })}
            className={`w-full ${inputClass}`}
          >
            <option value="all">Todas</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>
        </div>

        <div className="min-w-[10rem]">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Ordenar por
          </label>
          <select
            value={filters.sort}
            onChange={(e) => patch({ sort: e.target.value as TaskFilters['sort'] })}
            className={`w-full ${inputClass}`}
          >
            <option value="default">Padrão</option>
            <option value="title-asc">Título (A–Z)</option>
            <option value="title-desc">Título (Z–A)</option>
            <option value="due-asc">Prazo (mais próximo)</option>
            <option value="due-desc">Prazo (mais distante)</option>
            <option value="priority-desc">Prioridade (maior primeiro)</option>
          </select>
        </div>

        {hasActiveFilters(filters) && (
          <button
            type="button"
            onClick={() => onChange({ ...defaultTaskFilters })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        {filteredCount === totalCount
          ? `${totalCount} tarefa${totalCount === 1 ? '' : 's'} neste quadro`
          : `${filteredCount} de ${totalCount} tarefa${totalCount === 1 ? '' : 's'}`}
      </p>
    </section>
  )
}
