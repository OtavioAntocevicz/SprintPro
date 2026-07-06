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
import { deleteTask, updateTaskFavorite, updateTaskStatus } from '../services/apiData'
import { TaskNotesModal } from './TaskNotesModal'
import { useAuthStore } from '../store/authStore'
import type { Task, TaskStatus } from '../types'
import { taskPriorityLabel } from '../utils/taskPriorityLabel'
import { taskPhase } from '../utils/taskStatus'

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
  onLocalPatch: (taskId: string, patch: Partial<Pick<Task, 'status' | 'favorite' | 'notesCount'>>) => void
  onLocalRemove: (taskId: string) => void
  onRefetch: () => void
}

function TaskCard({
  task,
  dragDisabled,
  onToggleFavorite,
  canFavorite,
  canDelete,
  onDeleteTask,
  onOpenNotes,
}: {
  task: Task
  dragDisabled?: boolean
  onToggleFavorite: (task: Task) => void
  canFavorite: boolean
  canDelete: boolean
  onDeleteTask: (task: Task) => void
  onOpenNotes: (task: Task) => void
}) {
  const hasNotes = (task.notesCount ?? 0) > 0
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: dragDisabled,
  })
  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab touch-manipulation rounded-xl border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing dark:border-slate-600 dark:bg-slate-800 ${
        isDragging ? 'opacity-40 ring-2 ring-violet-300' : 'hover:border-slate-300 dark:hover:border-slate-500'
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {task.label && (
            <span className="rounded bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              {task.label}
            </span>
          )}
          {task.priority && (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {taskPriorityLabel(task.priority)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onOpenNotes(task)}
            title={hasNotes ? 'Ver anotações' : 'Adicionar anotações'}
            className={`rounded p-0.5 text-base leading-none ${
              hasNotes
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-slate-300 hover:text-violet-500 dark:hover:text-violet-400'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
          </button>
          {canFavorite && (
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onToggleFavorite(task)}
              title={task.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              className={`text-base leading-none ${task.favorite ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}
            >
              ★
            </button>
          )}
          {canDelete && (
            <details
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="relative"
            >
              <summary className="cursor-pointer list-none rounded px-1 text-base leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200">
                ⋯
              </summary>
              <div className="absolute right-0 z-20 mt-1 min-w-36 rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => onDeleteTask(task)}
                  className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Excluir tarefa
                </button>
              </div>
            </details>
          )}
        </div>
      </div>
      <h3 className="font-medium text-slate-900 dark:text-slate-100">{task.title}</h3>
      <p className="mt-1 line-clamp-3 text-sm text-slate-600 dark:text-slate-400">{task.description}</p>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{task.assigneeName ?? 'Sem responsável'}</span>
        <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : 'Sem prazo'}</span>
      </div>
    </article>
  )
}

function taskCardStatic(task: Task) {
  return (
    <article className="cursor-grabbing rounded-xl border border-violet-200 bg-white p-3 shadow-lg ring-2 ring-violet-400 dark:border-violet-700 dark:bg-slate-800">
      <h3 className="font-medium text-slate-900 dark:text-slate-100">{task.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{task.description}</p>
    </article>
  )
}

function Column({
  colId,
  title,
  status,
  list,
  onToggleFavorite,
  canFavorite,
  isOwner,
  onDeleteTask,
  onOpenNotes,
}: {
  colId: string
  title: string
  status: TaskStatus
  list: Task[]
  onToggleFavorite: (task: Task) => void
  canFavorite: boolean
  isOwner: boolean
  onDeleteTask: (task: Task) => void
  onOpenNotes: (task: Task) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colId, data: { type: 'column', status } })

  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-[min(50vh,480px)] flex-col rounded-2xl border-2 border-dashed p-3 transition-colors ${
        isOver
          ? 'border-violet-500 bg-violet-50/80 dark:bg-violet-950/50'
          : 'border-slate-200/80 bg-[#eef1f7] dark:border-slate-600 dark:bg-slate-800/50'
      } `}
    >
      <h2 className="mb-3 flex-shrink-0 text-lg font-semibold text-slate-900 dark:text-slate-100">
        {title} <span className="text-slate-400 dark:text-slate-500">({list.length})</span>
      </h2>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {list.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onToggleFavorite={onToggleFavorite}
            canFavorite={canFavorite}
            canDelete={isOwner && status === 'done'}
            onDeleteTask={onDeleteTask}
            onOpenNotes={onOpenNotes}
          />
        ))}
      </div>
    </section>
  )
}

export function KanbanSection({ tasks, allTasks, onLocalPatch, onLocalRemove, onRefetch }: Props) {
  const [active, setActive] = useState<Task | null>(null)
  const [notesTask, setNotesTask] = useState<Task | null>(null)
  const [feedback, setFeedback] = useState('')
  const appUser = useAuthStore((s) => s.appUser)
  const canFavorite = appUser?.role === 'owner' || appUser?.canFavorite === true
  const isOwner = appUser?.role === 'owner'
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

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

    onLocalPatch(taskId, { status: newStatus })
    void (async () => {
      try {
        await updateTaskStatus(taskId, newStatus)
      } catch (err) {
        onLocalPatch(taskId, { status: t.status })
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

  function onDeleteTask(task: Task) {
    if (!isOwner) return
    const ok = window.confirm(`Excluir a tarefa "${task.title}"?`)
    if (!ok) return

    onLocalRemove(task.id)
    void (async () => {
      try {
        await deleteTask(task.id)
      } catch (err) {
        setFeedback(err instanceof Error ? err.message : 'Não foi possível excluir a tarefa.')
        await onRefetch()
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
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{feedback}</p>
      )}
      <div className="grid gap-4 xl:grid-cols-3">
        {ORDER.map((col) => (
          <Column
            key={col.key}
            colId={COL[col.key]}
            title={col.title}
            status={col.status}
            list={tasks[col.key]}
            onToggleFavorite={onToggleFavorite}
            canFavorite={canFavorite}
            isOwner={isOwner}
            onDeleteTask={onDeleteTask}
            onOpenNotes={setNotesTask}
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
    </DndContext>
  )
}
