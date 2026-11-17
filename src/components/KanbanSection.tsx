import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { updateTaskFavorite, updateTaskStatus } from '../services/apiData'
import { TaskEditModal } from './TaskEditModal'
import { TaskNotesModal } from './TaskNotesModal'
import { useAuthStore } from '../store/authStore'
import type { AppUser, Task, TaskCategory, TaskStatus } from '../types'
import type { TaskLocalPatch } from '../hooks/useTasks'
import { taskPriorityLabel } from '../utils/taskPriorityLabel'
import { taskPhase } from '../utils/taskStatus'
import { dueTone, relativeDueLabel, type DueTone } from '../utils/taskDue'
import { Avatar } from './ui'

const COL = {
  todo: 'col-todo',
  doing: 'col-doing',
  done: 'col-done',
} as const

const ORDER: { key: keyof typeof COL; title: string; status: TaskStatus }[] = [
  { key: 'todo', title: 'A fazer', status: 'todo' },
  { key: 'doing', title: 'Em progresso', status: 'doing' },
  { key: 'done', title: 'Concluído', status: 'done' },
]

type Props = {
  tasks: { todo: Task[]; doing: Task[]; done: Task[] }
  allTasks: Task[]
  members: AppUser[]
  categories: TaskCategory[]
  onLocalPatch: (taskId: string, patch: TaskLocalPatch) => void
  onLocalRemove: (taskId: string) => void
  onRefetch: () => void
}

const iconBtn =
  'grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-violet-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-violet-300'

function stop(e: React.SyntheticEvent) {
  e.stopPropagation()
}

const PRIORITY_LEVEL = { low: 1, medium: 2, high: 3 } as const

/** Prioridade como "barras de sinal": monocromático, só a alta ganha cor. */
function PriorityBars({ priority }: { priority: 'low' | 'medium' | 'high' }) {
  const level = PRIORITY_LEVEL[priority]
  const label = `Prioridade ${taskPriorityLabel(priority).toLowerCase()}`
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 ${
        priority === 'high' ? 'text-rose-500 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
      }`}
    >
      <svg viewBox="0 0 14 12" className="h-3 w-3.5" fill="currentColor" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x={i * 5}
            y={8 - i * 4}
            width="3.5"
            height={4 + i * 4}
            rx="1"
            opacity={i < level ? 1 : 0.22}
          />
        ))}
      </svg>
    </span>
  )
}

const DUE_TEXT: Record<DueTone, string> = {
  none: 'text-slate-400 dark:text-slate-500',
  later: 'text-slate-500 dark:text-slate-400',
  soon: 'text-slate-700 dark:text-slate-200',
  today: 'font-semibold text-slate-900 dark:text-white',
  overdue: 'font-semibold text-rose-600 dark:text-rose-400',
}

function TaskCard({
  task,
  onToggleFavorite,
  canFavorite,
  onOpenNotes,
  onOpenEdit,
}: {
  task: Task
  onToggleFavorite: (task: Task) => void
  canFavorite: boolean
  onOpenNotes: (task: Task) => void
  onOpenEdit: (task: Task) => void
}) {
  const notesCount = task.notesCount ?? 0
  const hasNotes = notesCount > 0
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  })
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined
  const tone = dueTone(task)
  const isDone = task.status === 'done'

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative shrink-0 cursor-grab touch-manipulation rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition active:cursor-grabbing dark:border-slate-700 dark:bg-slate-800 ${
        isDragging
          ? 'opacity-40 ring-2 ring-violet-300'
          : 'hover:border-slate-300 hover:shadow-md dark:hover:border-slate-500'
      }`}
    >
      <div className="mb-1.5 flex h-6 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {task.priority && !isDone && <PriorityBars priority={task.priority} />}
          {task.label && (
            <span className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              {task.label}
            </span>
          )}
        </div>
        <div className="-mr-1 -mt-1 flex shrink-0 items-center">
          <button
            type="button"
            onMouseDown={stop}
            onPointerDown={stop}
            onClick={() => onOpenEdit(task)}
            title="Editar tarefa"
            aria-label={`Editar tarefa ${task.title}`}
            className={`${iconBtn} opacity-0 focus-visible:opacity-100 group-hover:opacity-100`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
          {canFavorite && (
            <button
              type="button"
              onMouseDown={stop}
              onPointerDown={stop}
              onClick={() => onToggleFavorite(task)}
              title={task.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              aria-label={task.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              aria-pressed={Boolean(task.favorite)}
              className={`grid h-7 w-7 place-items-center rounded-md text-base leading-none transition hover:bg-slate-100 dark:hover:bg-slate-700 ${
                task.favorite
                  ? 'text-amber-500'
                  : 'text-slate-400 opacity-0 hover:text-amber-500 focus-visible:opacity-100 group-hover:opacity-100 dark:text-slate-500'
              }`}
            >
              ★
            </button>
          )}
        </div>
      </div>
      <button
        type="button"
        onMouseDown={stop}
        onPointerDown={stop}
        onClick={() => onOpenNotes(task)}
        className="w-full text-left"
        title={hasNotes ? 'Ver anotações' : 'Adicionar anotações'}
      >
        <h3
          className={`font-medium leading-snug ${
            isDone ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'
          }`}
        >
          {task.title}
        </h3>
        {task.description && (
          <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{task.description}</p>
        )}
      </button>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <div className="flex min-w-0 items-center gap-1.5 text-slate-600 dark:text-slate-300">
          {task.assigneeName ? (
            <>
              <Avatar name={task.assigneeName} size="xs" />
              <span className="truncate">{task.assigneeName.split(' ')[0]}</span>
            </>
          ) : (
            <span className="text-slate-400">Sem responsável</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onMouseDown={stop}
            onPointerDown={stop}
            onClick={() => onOpenNotes(task)}
            title={hasNotes ? `${notesCount} anotação(ões)` : 'Adicionar anotação'}
            aria-label={hasNotes ? `Ver ${notesCount} anotações` : 'Adicionar anotação'}
            className={`flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 ${
              hasNotes ? 'text-violet-600 dark:text-violet-300' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {hasNotes && <span className="font-medium">{notesCount}</span>}
          </button>
          {task.dueDate && (
            <span
              title={`Prazo: ${new Date(`${task.dueDate.slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR')}`}
              className={`flex items-center gap-1 px-1 ${DUE_TEXT[tone]}`}
            >
              {tone === 'overdue' && (
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              )}
              {relativeDueLabel(task)}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

function taskCardStatic(task: Task) {
  return (
    <article className="rotate-1 cursor-grabbing rounded-xl border border-violet-200 bg-white p-3 shadow-xl ring-2 ring-violet-400 dark:border-violet-700 dark:bg-slate-800">
      <h3 className="font-medium text-slate-900 dark:text-slate-100">{task.title}</h3>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{task.description}</p>
      )}
    </article>
  )
}

const COLUMN_ACCENT: Record<TaskStatus, string> = {
  todo: 'bg-slate-400',
  doing: 'bg-violet-500',
  done: 'bg-emerald-500',
}

function Column({
  colId,
  title,
  status,
  list,
  dragging,
  onToggleFavorite,
  canFavorite,
  onOpenNotes,
  onOpenEdit,
}: {
  colId: string
  title: string
  status: TaskStatus
  list: Task[]
  dragging: boolean
  onToggleFavorite: (task: Task) => void
  canFavorite: boolean
  onOpenNotes: (task: Task) => void
  onOpenEdit: (task: Task) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colId, data: { type: 'column', status } })

  return (
    <section
      ref={setNodeRef}
      aria-label={`Coluna ${title}`}
      className={`flex min-h-[min(50vh,480px)] flex-col rounded-2xl border-2 p-3 transition-colors ${
        isOver
          ? 'border-dashed border-violet-500 bg-violet-50/80 dark:bg-violet-950/50'
          : dragging
            ? 'border-dashed border-slate-300 bg-column dark:border-slate-600 dark:bg-slate-800/50'
            : 'border-transparent bg-column dark:bg-slate-800/40'
      }`}
    >
      <div className="mb-3 flex-shrink-0 px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${COLUMN_ACCENT[status]}`} aria-hidden="true" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">{title}</h2>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
            {list.length}
          </span>
        </div>
        {status === 'done' && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Visíveis por 24h; histórico em Concluídos</p>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 pb-1">
        {list.length === 0 ? (
          <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-600 dark:text-slate-500">
            {status === 'done' ? 'Arraste aqui o que foi concluído' : 'Nenhuma tarefa. Arraste uma para cá.'}
          </div>
        ) : (
          list.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleFavorite={onToggleFavorite}
              canFavorite={canFavorite}
              onOpenNotes={onOpenNotes}
              onOpenEdit={onOpenEdit}
            />
          ))
        )}
      </div>
    </section>
  )
}

export function KanbanSection({
  tasks,
  allTasks,
  members,
  categories,
  onLocalPatch,
  onLocalRemove,
}: Props) {
  const [active, setActive] = useState<Task | null>(null)
  const [notesTask, setNotesTask] = useState<Task | null>(null)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [feedback, setFeedback] = useState('')
  const appUser = useAuthStore((s) => s.appUser)
  const canFavorite = appUser?.role === 'owner' || appUser?.canFavorite === true
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id)
    setActive(allTasks.find((t) => t.id === id) ?? null)
  }

  function onDragEnd(e: DragEndEvent) {
    setFeedback('')
    setActive(null)
    const { active, over } = e
    if (!over) return
    const taskId = String(active.id)
    const t = allTasks.find((x) => x.id === taskId)
    if (!t) return

    let newStatus: TaskStatus | null = null
    const o = over.id
    if (o === COL.todo) newStatus = 'todo'
    else if (o === COL.doing) newStatus = 'doing'
    else if (o === COL.done) newStatus = 'done'
    const data = over.data.current as { type?: string; status?: TaskStatus } | undefined
    if (!newStatus && data?.type === 'column' && data.status) {
      newStatus = data.status
    }

    if (!newStatus) return
    if (taskPhase(t.status) === newStatus) return

    const previousCompletedAt = t.completedAt
    const previousFavorite = t.favorite
    onLocalPatch(taskId, {
      status: newStatus,
      completedAt: newStatus === 'done' ? new Date().toISOString() : undefined,
      ...(newStatus === 'done' ? { favorite: false } : {}),
    })
    void (async () => {
      try {
        await updateTaskStatus(taskId, newStatus)
      } catch (err) {
        onLocalPatch(taskId, {
          status: t.status,
          completedAt: previousCompletedAt,
          favorite: previousFavorite,
        })
        setFeedback(err instanceof Error ? err.message : 'Não foi possível alterar a coluna. Tente de novo.')
      }
    })()
  }

  function onToggleFavorite(task: Task) {
    if (!canFavorite) return
    const next = !task.favorite
    onLocalPatch(task.id, { favorite: next })
    void (async () => {
      try {
        await updateTaskFavorite(task.id, next)
      } catch (err) {
        onLocalPatch(task.id, { favorite: task.favorite ?? false })
        setFeedback(err instanceof Error ? err.message : 'Não foi possível atualizar favorito.')
      }
    })()
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {feedback && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {feedback}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        {ORDER.map((col) => (
          <Column
            key={col.key}
            colId={COL[col.key]}
            dragging={active !== null}
            title={col.title}
            status={col.status}
            list={tasks[col.key]}
            onToggleFavorite={onToggleFavorite}
            canFavorite={canFavorite}
            onOpenNotes={setNotesTask}
            onOpenEdit={setEditTask}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>{active ? taskCardStatic(active) : null}</DragOverlay>
      <TaskNotesModal
        task={notesTask}
        open={notesTask !== null}
        onClose={() => setNotesTask(null)}
        onNotesCountChange={(taskId, notesCount) => onLocalPatch(taskId, { notesCount })}
      />
      <TaskEditModal
        task={editTask}
        open={editTask !== null}
        members={members}
        categories={categories}
        onClose={() => setEditTask(null)}
        canDelete={appUser?.role === 'owner'}
        onDeleted={onLocalRemove}
        onSaved={(updated) =>
          onLocalPatch(updated.id, {
            description: updated.description,
            label: updated.label,
            priority: updated.priority,
            dueDate: updated.dueDate,
            assigneeName: updated.assigneeName,
            assignedTo: updated.assignedTo,
          })
        }
      />
    </DndContext>
  )
}
