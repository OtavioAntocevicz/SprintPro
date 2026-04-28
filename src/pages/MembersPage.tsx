import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Layout } from '../components/Layout'
import {
  createInvite,
  deleteMember,
  fetchInvites,
  fetchMembers,
  updateMemberFavoritePermission,
} from '../services/apiData'
import { useAuthStore } from '../store/authStore'
import { userRoleLabel } from '../utils/userRoleLabel'
import type { AppUser, Invite } from '../types'

const POLL_MS = 4000

export function MembersPage() {
  const appUser = useAuthStore((state) => state.appUser)
  const [members, setMembers] = useState<AppUser[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [feedback, setFeedback] = useState('')
  const [inviting, setInviting] = useState(false)
  const [nowTs, setNowTs] = useState(() => Date.now())

  useEffect(() => {
    if (!appUser?.organizationId) return
    let cancelled = false
    async function load() {
      try {
        const [m, i] = await Promise.all([fetchMembers(), fetchInvites()])
        if (!cancelled) {
          setMembers(m)
          setInvites(i)
        }
      } catch (e) {
        console.error(e)
      }
    }
    void load()
    const id = window.setInterval(() => void load(), POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [appUser?.organizationId])

  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const pendingInvites = useMemo(
    () => invites.filter((invite) => invite.status === 'pending').length,
    [invites],
  )

  async function onInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!appUser?.organizationId || !inviteEmail.trim()) return
    const email = inviteEmail.trim().toLowerCase()
    setInviting(true)
    try {
      const inv = await createInvite({
        email,
        organizationId: appUser.organizationId,
        role: 'member',
      })
      setInviteEmail('')
      setFeedback(
        `Convite criado. Envie ao colaborador: ${window.location.origin}/accept-invite?invite=${inv.id} (o email deve ser o mesmo do convite)`,
      )
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Falha ao criar convite.')
    } finally {
      setInviting(false)
    }
  }

  function isOnline(lastSeenAt?: string) {
    if (!lastSeenAt) return false
    return nowTs - new Date(lastSeenAt).getTime() <= 70_000
  }

  function formatLastAccess(lastSeenAt?: string) {
    if (!lastSeenAt) return 'Sem atividade recente'
    const diffSec = Math.max(0, Math.floor((nowTs - new Date(lastSeenAt).getTime()) / 1000))
    if (diffSec < 60) return `Agora há ${diffSec}s`
    const min = Math.floor(diffSec / 60)
    if (min < 60) return `Há ${min} min`
    const h = Math.floor(min / 60)
    return `Há ${h} h`
  }

  async function onToggleFavoritePermission(member: AppUser) {
    if (appUser?.role !== 'owner' || member.role === 'owner') return
    const next = !member.canFavorite
    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, canFavorite: next } : m)))
    try {
      await updateMemberFavoritePermission(member.id, next)
      setFeedback(
        next
          ? `${member.fullName || member.email} agora pode favoritar tarefas.`
          : `${member.fullName || member.email} não pode mais favoritar tarefas.`,
      )
    } catch (e) {
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, canFavorite: member.canFavorite } : m)))
      setFeedback(e instanceof Error ? e.message : 'Falha ao atualizar permissão.')
    }
  }

  async function onRemoveMember(member: AppUser) {
    if (appUser?.role !== 'owner' || member.role === 'owner') return
    const ok = window.confirm(`Remover ${member.fullName || member.email} da equipe?`)
    if (!ok) return
    const previous = members
    setMembers((prev) => prev.filter((m) => m.id !== member.id))
    try {
      await deleteMember(member.id)
      setFeedback(`${member.fullName || member.email} removido(a) da equipe.`)
    } catch (e) {
      setMembers(previous)
      setFeedback(e instanceof Error ? e.message : 'Falha ao remover membro.')
    }
  }

  return (
    <Layout searchPlaceholder="Pesquisar membros...">
      <section className="mb-5 flex items-center justify-between">
        <h1 className="text-4xl font-semibold">Membros da Organização</h1>
        <form onSubmit={onInvite} className="flex items-center gap-2">
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@empresa.com"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={inviting || appUser?.role !== 'owner'}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {inviting ? 'Enviando...' : '+ Convidar Membro'}
          </button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total de membros</p>
          <p className="mt-2 text-4xl font-bold">{members.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Assentos disponíveis</p>
          <p className="mt-2 text-4xl font-bold">{Math.max(0, 20 - members.length)}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Convites pendentes</p>
          <p className="mt-2 text-4xl font-bold">{pendingInvites}</p>
        </article>
      </section>

      {feedback && <p className="mt-3 text-sm text-emerald-600">{feedback}</p>}

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-5 border-b border-slate-200 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <p>Pessoa</p>
          <p>Função</p>
          <p>Status</p>
          <p>Último acesso</p>
          <p>Ações</p>
        </div>
        <div>
          {members.map((member) => (
            <article key={member.id} className="grid grid-cols-5 items-center px-5 py-4 text-sm text-slate-700">
              <div>
                <p className="font-semibold text-slate-900">{member.fullName || member.email}</p>
                <p className="text-slate-500">{member.email}</p>
              </div>
              <p>{userRoleLabel(member.role)}</p>
              <p className={isOnline(member.lastSeenAt) ? 'text-emerald-600' : 'text-slate-500'}>
                {isOnline(member.lastSeenAt) ? 'Online' : 'Offline'}
              </p>
              <p className="text-slate-500">{formatLastAccess(member.lastSeenAt)}</p>
              <div>
                {appUser?.role === 'owner' && member.role !== 'owner' ? (
                  <details className="relative">
                    <summary className="inline-flex cursor-pointer list-none items-center rounded px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700">
                      ⋯
                    </summary>
                    <div className="absolute right-0 z-20 mt-1 min-w-48 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                      <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(member.canFavorite)}
                          onChange={() => void onToggleFavoritePermission(member)}
                        />
                        <span>Permissão: Favorirar</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => void onRemoveMember(member)}
                        className="w-full rounded-md bg-red-50 px-2 py-1.5 text-left text-xs text-red-600 hover:bg-red-100"
                      >
                        Excluir membro
                      </button>
                      <p className="mt-2 text-[10px] leading-tight text-slate-400">
                        Ação exclusiva do gestor. Após excluir, o membro pode ser convidado novamente.
                      </p>
                    </div>
                  </details>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </Layout>
  )
}
