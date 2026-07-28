import type { AppUser } from '../types'
import {
  defaultTaskFilters,
  hasActiveFilters,
  type TaskFilters,
} from '../utils/filterTasks'

type Props = {
  filters: TaskFilters
  members: AppUser[]
  labelOptions: string[]
  totalCount: number
  filteredCount: number
  onChange: (filters: TaskFilters) => void
}

const selectClass =
  'min-w-[7rem] rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-7 text-sm font-medium text-slate-900 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'

export function BoardTaskFilters({
  filters,
  members,
  labelOptions,
  totalCount,
  filteredCount,
  onChange,
}: Props) {
  function patch(partial: Partial<TaskFilters>) {
    onChange({ ...filters, ...partial })
  }

  const active = hasActiveFilters({ ...filters, query: '' })

  return (
    <section className="mb-5">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
        <span className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Filtros</span>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

        <label className="flex items-center gap-1.5 rounded-lg px-2 hover:bg-slate-50 dark:hover:bg-slate-800">
          <span className="text-xs text-slate-400">Categoria</span>
          <select
            value={filters.label}
            onChange={(e) => patch({ label: e.target.value })}
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

        <label className="flex items-center gap-1.5 rounded-lg px-2 hover:bg-slate-50 dark:hover:bg-slate-800">
          <span className="text-xs text-slate-400">Responsável</span>
          <select
            value={filters.assigneeId}
            onChange={(e) => patch({ assigneeId: e.target.value })}
            className={selectClass}
          >
            <option value="">Todos</option>
            <option value="unassigned">Sem responsável</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.fullName || member.email}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5 rounded-lg px-2 hover:bg-slate-50 dark:hover:bg-slate-800">
          <span className="text-xs text-slate-400">Prazo</span>
          <select
            value={filters.due}
            onChange={(e) => patch({ due: e.target.value as TaskFilters['due'] })}
            className={selectClass}
          >
            <option value="all">Todos</option>
            <option value="with-due">Com prazo</option>
            <option value="no-due">Sem prazo</option>
            <option value="overdue">Atrasadas</option>
            <option value="next-7-days">Próximos 7 dias</option>
          </select>
        </label>

        <label className="flex items-center gap-1.5 rounded-lg px-2 hover:bg-slate-50 dark:hover:bg-slate-800">
          <span className="text-xs text-slate-400">Prioridade</span>
          <select
            value={filters.priority}
            onChange={(e) => patch({ priority: e.target.value as TaskFilters['priority'] })}
            className={selectClass}
          >
            <option value="all">Todas</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>
        </label>

        <label className="flex items-center gap-1.5 rounded-lg px-2 hover:bg-slate-50 dark:hover:bg-slate-800">
          <span className="text-xs text-slate-400">Ordenar</span>
          <select
            value={filters.sort}
            onChange={(e) => patch({ sort: e.target.value as TaskFilters['sort'] })}
            className={selectClass}
          >
            <option value="default">Padrão</option>
            <option value="title-asc">Título (A–Z)</option>
            <option value="title-desc">Título (Z–A)</option>
            <option value="due-asc">Prazo (mais próximo)</option>
            <option value="due-desc">Prazo (mais distante)</option>
            <option value="priority-desc">Prioridade</option>
          </select>
        </label>

        <div className="ml-auto flex items-center gap-3">
          {active && (
            <button
              type="button"
              onClick={() => onChange({ ...defaultTaskFilters, query: filters.query })}
              className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              Limpar
            </button>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {filteredCount === totalCount
              ? `${totalCount} tarefa${totalCount === 1 ? '' : 's'}`
              : `${filteredCount} de ${totalCount}`}
          </p>
        </div>
      </div>
    </section>
  )
}
