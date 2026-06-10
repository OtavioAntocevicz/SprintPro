import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { KanbanSection } from '../components/KanbanSection'
import { Layout } from '../components/Layout'
import { useTasks } from '../hooks/useTasks'
import { createTask } from '../services/apiData'
import { useAuthStore } from '../store/authStore'

export function BoardPage() {
  const { boardId } = useParams()
  const appUser = useAuthStore((state) => state.appUser)
  const taskState = useTasks(appUser?.organizationId, boardId)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!boardId || !appUser?.organizationId || !title.trim()) return
    await createTask({
      title: title.trim(),
      description: description.trim(),
      boardId,
      organizationId: appUser.organizationId,
      assignedTo: null,
    })
    await taskState.refetch()
    setTitle('')
    setDescription('')
  }

  return (
    <Layout searchPlaceholder="Buscar tarefas...">
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Board Kanban</h1>
        <form onSubmit={onSubmit} className="mt-4 grid gap-2 md:grid-cols-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da tarefa"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-white">Adicionar</button>
        </form>
      </section>

      <div className="mt-4">
        <KanbanSection
          tasks={{ todo: taskState.todo, doing: taskState.doing, done: taskState.done }}
          allTasks={taskState.all}
          onLocalPatch={taskState.patchTaskLocal}
          onLocalRemove={taskState.removeTaskLocal}
          onRefetch={taskState.refetch}
        />
      </div>
    </Layout>
  )
}
