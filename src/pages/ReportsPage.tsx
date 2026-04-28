import { useEffect, useMemo, useState } from 'react'
import { Layout } from '../components/Layout'
import { fetchMembers, fetchOrganizationTasks } from '../services/apiData'
import { useAuthStore } from '../store/authStore'
import type { AppUser, Task } from '../types'

type Period = '7d' | '30d' | '90d' | 'all'

export function ReportsPage() {
  const appUser = useAuthStore((s) => s.appUser)
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<AppUser[]>([])
  const [period, setPeriod] = useState<Period>('30d')
  const [nowTs, setNowTs] = useState(() => Date.now())

  useEffect(() => {
    if (!appUser?.organizationId) return
    let cancelled = false
    async function load() {
      try {
        const [t, m] = await Promise.all([fetchOrganizationTasks(), fetchMembers()])
        if (!cancelled) {
          setTasks(t)
          setMembers(m)
        }
      } catch (e) {
        console.error(e)
      }
    }
    void load()
    const id = window.setInterval(() => void load(), 10000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [appUser?.organizationId])

  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const filteredTasks = useMemo(() => {
    if (period === 'all') return tasks
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const from = nowTs - days * 24 * 60 * 60 * 1000
    return tasks.filter((t) => {
      const ts = new Date(t.createdAt).getTime()
      return Number.isFinite(ts) && ts >= from
    })
  }, [tasks, period, nowTs])

  const byMember = useMemo(() => {
    return members.map((member) => {
      const mine = filteredTasks.filter((t) => t.assignedTo === member.id || t.assigneeName === member.fullName)
      const done = mine.filter((t) => t.status === 'done').length
      const open = mine.length - done
      return {
        id: member.id,
        name: member.fullName || member.email,
        total: mine.length,
        done,
        open,
      }
    })
  }, [members, filteredTasks])

  const totals = useMemo(() => {
    const done = filteredTasks.filter((t) => t.status === 'done').length
    const doing = filteredTasks.filter((t) => t.status === 'doing').length
    const todo = filteredTasks.filter((t) => t.status === 'todo').length
    return { done, doing, todo, total: filteredTasks.length }
  }, [filteredTasks])

  return (
    <Layout searchPlaceholder="Relatórios">
      <section className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-4xl font-semibold">Relatórios</h1>
            <p className="text-slate-500">Conclusão por membro e tarefas por responsável.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Período:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="all">Tudo</option>
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase text-slate-500">Total</p>
          <p className="mt-2 text-3xl font-bold">{totals.total}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase text-slate-500">A fazer</p>
          <p className="mt-2 text-3xl font-bold">{totals.todo}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase text-slate-500">Em progresso</p>
          <p className="mt-2 text-3xl font-bold">{totals.doing}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase text-slate-500">Concluídas</p>
          <p className="mt-2 text-3xl font-bold">{totals.done}</p>
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-4 border-b border-slate-200 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <p>Membro</p>
          <p>Tarefas atribuídas</p>
          <p>Concluídas</p>
          <p>Em aberto</p>
        </div>
        <div>
          {byMember.map((item) => (
            <article key={item.id} className="grid grid-cols-4 items-center px-5 py-3 text-sm">
              <p className="font-medium text-slate-900">{item.name}</p>
              <p>{item.total}</p>
              <p className="text-emerald-600">{item.done}</p>
              <p className="text-slate-600">{item.open}</p>
            </article>
          ))}
          {byMember.length === 0 && <p className="px-5 py-6 text-sm text-slate-500">Sem membros para exibir.</p>}
        </div>
      </section>
    </Layout>
  )
}
