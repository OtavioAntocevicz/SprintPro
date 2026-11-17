import { useState } from 'react'
import type { AppUser } from '../types'
import { defaultTaskFilters, type TaskFilters } from '../utils/filterTasks'
import { inputClass } from './uiStyles'

type Props = {
  filters: TaskFilters
  members: AppUser[]
  labelOptions: string[]
  totalCount: number
  filteredCount: number
  onChange: (filters: TaskFilters) => void
}

const DUE_LABELS: Record<TaskFilters['due'], string> = {
  all: 'Todos',
  'with-due': 'Com prazo',
  'no-due': 'Sem prazo',
  overdue: 'Atrasadas',
  'next-7-days': 'Próximos 7 dias',
}

const PRIORITY_LABELS: Record<TaskFilters['priority'], string> = {
  all: 'Todas',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
}

const SORT_LABELS: Record<TaskFilters['sort'], string> = {
  default: 'Padrão',
  'title-asc': 'Título (A–Z)',
  'title-desc': 'Título (Z–A)',
  'due-asc': 'Prazo (mais próximo)',
  'due-desc': 'Prazo (mais distante)',
  'priority-desc': 'Prioridade',
}

type Chip = { key: string; text: string; reset: Partial<TaskFilters> }

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

  const chips: Chip[] = []
  if (filters.label) chips.push({ key: 'label', text: `Categoria: ${filters.label}`, reset: { label: '' } })
  if (filters.assigneeId) {
    const name =
      filters.assigneeId === 'unassigned'
        ? 'Sem responsável'
        : (members.find((m) => m.id === filters.assigneeId)?.fullName ?? 'Membro')
    chips.push({ key: 'assignee', text: `Responsável: ${name}`, reset: { assigneeId: '' } })
  }
  if (filters.due !== 'all') chips.push({ key: 'due', text: `Prazo: ${DUE_LABELS[filters.due]}`, reset: { due: 'all' } })
  if (filters.priority !== 'all') {
    chips.push({ key: 'priority', text: `Prioridade: ${PRIORITY_LABELS[filters.priority]}`, reset: { priority: 'all' } })
  }
  if (filters.sort !== 'default') {
    chips.push({ key: 'sort', text: `Ordem: ${SORT_LABELS[filters.sort]}`, reset: { sort: 'default' } })
  }

  // Abre já expandido se a página chegou com filtro aplicado (ex.: ?prazo=overdue).
  const [open, setOpen] = useState(() => chips.length > 0)

  return (
    <section className="mb-5 rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="board-filters-panel"
          className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 5h18M6 12h12M10 19h4" />
          </svg>
          Filtros
          {chips.length > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-violet-600 px-1 text-[11px] font-semibold text-white">
              {chips.length}
            </span>
          )}
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {!open && chips.length > 0 && (
          <ul className="flex min-w-0 flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <li key={chip.key}>
                <button
                  type="button"
                  onClick={() => patch(chip.reset)}
                  title="Remover filtro"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-0.5 pl-2.5 pr-1.5 text-xs text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {chip.text}
                  <span aria-hidden="true" className="text-slate-400">
                    ×
                  </span>
                  <span className="sr-only">(remover)</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="ml-auto flex items-center gap-3">
          {chips.length > 0 && (
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

      {open && (
        <div
          id="board-filters-panel"
          className="grid gap-3 border-t border-slate-200/80 px-4 pb-4 pt-3 sm:grid-cols-2 lg:grid-cols-5 dark:border-slate-700"
        >
          <FilterField label="Categoria">
            <select value={filters.label} onChange={(e) => patch({ label: e.target.value })} className={inputClass}>
              <option value="">Todas</option>
              {labelOptions.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Responsável">
            <select
              value={filters.assigneeId}
              onChange={(e) => patch({ assigneeId: e.target.value })}
              className={inputClass}
            >
              <option value="">Todos</option>
              <option value="unassigned">Sem responsável</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName || member.email}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Prazo">
            <select
              value={filters.due}
              onChange={(e) => patch({ due: e.target.value as TaskFilters['due'] })}
              className={inputClass}
            >
              {Object.entries(DUE_LABELS).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Prioridade">
            <select
              value={filters.priority}
              onChange={(e) => patch({ priority: e.target.value as TaskFilters['priority'] })}
              className={inputClass}
            >
              {Object.entries(PRIORITY_LABELS).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Ordenar por">
            <select
              value={filters.sort}
              onChange={(e) => patch({ sort: e.target.value as TaskFilters['sort'] })}
              className={inputClass}
            >
              {Object.entries(SORT_LABELS).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </FilterField>
        </div>
      )}
    </section>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  )
}
