import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ErrorBlock, LoadingBlock } from '../components/AsyncState'
import { Layout } from '../components/Layout'
import {
  createInvite,
  deleteMember,
  fetchInvites,
  fetchMembers,
  revokeInvite,
  updateMemberFavoritePermission,
} from '../services/apiData'
import { useMembersCount } from '../hooks/useMembersCount'
import { useAuthStore } from '../store/authStore'
import { useHeaderSearchStore } from '../store/headerSearchStore'
import { pollIntervalForMemberCount } from '../utils/pollInterval'
import { userRoleLabel } from '../utils/userRoleLabel'
import type { AppUser, Invite } from '../types'

export function MembersPage() {
  const appUser = useAuthStore((state) => state.appUser)
  const memberCount = useMembersCount(appUser?.organizationId)
  const pollMs = pollIntervalForMemberCount(memberCount)
  const [members, setMembers] = useState<AppUser[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [feedback, setFeedback] = useState('')
  const [feedbackTone, setFeedbackTone] = useState<'success' | 'error'>('success')
  const [inviting, setInviting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nowTs, setNowTs] = useState(() => Date.now())
  const headerQuery = useHeaderSearchStore((s) => s.query)

  const load = async () => {
    if (!appUser?.organizationId) return
    setError('')
    try {
      const [m, i] = await Promise.all([fetchMembers(), fetchInvites()])
      setMembers(m)
      setInvites(i)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar os membros.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!appUser?.organizationId) return
    let cancelled = false
    async function run() {
      try {
        const [m, i] = await Promise.all([fetchMembers(), fetchInvites()])
        if (!cancelled) {
          setMembers(m)
          setInvites(i)
          setError('')
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Não foi possível carregar os membros.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    setLoading(true)
    void run()
    const id = window.setInterval(() => void run(), pollMs)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [appUser?.organizationId, pollMs])

  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const pendingInvites = useMemo(
    () => invites.filter((invite) => invite.status === 'pending'),
    [invites],
  )

  const filteredMembers = useMemo(() => {
    const q = headerQuery.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        userRoleLabel(m.role).toLowerCase().includes(q),
    )
  }, [members, headerQuery])

  function inviteLink(inviteId: string) {
    return `${window.location.origin}/accept-invite?invite=${inviteId}`
  }

  async function copyInviteLink(inviteId: string) {
    try {
      await navigator.clipboard.writeText(inviteLink(inviteId))
      setFeedbackTone('success')
      setFeedback('Link do convite copiado.')
    } catch {
      setFeedbackTone('error')
      setFeedback('Não foi possível copiar o link.')
    }
  }

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
      setFeedbackTone('success')
      setFeedback('Convite criado. Copie o link abaixo e envie ao colaborador.')
      setInvites((prev) => [inv, ...prev])
    } catch (e) {
      setFeedbackTone('error')
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
      setFeedbackTone('success')
      setFeedback(
        next
          ? `${member.fullName || member.email} agora pode favoritar tarefas.`
          : `${member.fullName || member.email} não pode mais favoritar tarefas.`,
      )
    } catch (e) {
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, canFavorite: member.canFavorite } : m)))
      setFeedbackTone('error')
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
      setFeedbackTone('success')
      setFeedback(`${member.fullName || member.email} removido(a) da equipe.`)
    } catch (e) {
      setMembers(previous)
      setFeedbackTone('error')
      setFeedback(e instanceof Error ? e.message : 'Falha ao remover membro.')
    }
  }

  async function onRevokeInvite(inviteId: string) {
    if (appUser?.role !== 'owner') return
    const ok = window.confirm('Revogar este convite pendente?')
    if (!ok) return
    try {
      await revokeInvite(inviteId)
      setInvites((prev) => prev.filter((i) => i.id !== inviteId))
      setFeedbackTone('success')
      setFeedback('Convite revogado.')
    } catch (e) {
      setFeedbackTone('error')
      setFeedback(e instanceof Error ? e.message : 'Falha ao revogar convite.')
    }
  }

  return (
    <Layout searchPlaceholder="Buscar membros por nome ou e-mail...">
      <section className="mb-5 flex items-center justify-between">
        <h1 className="text-4xl font-semibold">Membros da Organização</h1>
        <form onSubmit={onInvite} className="flex items-center gap-2">
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@empresa.com"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Total de membros</p>
          <p className="mt-2 text-4xl font-bold">{members.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Assentos disponíveis</p>
          <p className="mt-2 text-4xl font-bold">{Math.max(0, 20 - members.length)}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Convites pendentes</p>
          <p className="mt-2 text-4xl font-bold">{pendingInvites.length}</p>
        </article>
      </section>

      {error && <ErrorBlock message={error} onRetry={() => void load()} className="mt-3" />}
      {feedback && (
        <p className={`mt-3 text-sm ${feedbackTone === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
          {feedback}
        </p>
      )}

      {appUser?.role === 'owner' && pendingInvites.length > 0 && (
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Convites pendentes
          </div>
          <div>
            {pendingInvites.map((invite) => (
              <article key={invite.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 last:border-0 dark:border-slate-800">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{invite.email}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{userRoleLabel(invite.role)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyInviteLink(invite.id)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-700"
                  >
                    Copiar link
                  </button>
                  <button
                    type="button"
                    onClick={() => void onRevokeInvite(invite.id)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 dark:border-red-900 dark:text-red-400"
                  >
                    Revogar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <LoadingBlock label="Carregando membros..." className="mt-5" />
      ) : (
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="grid grid-cols-5 border-b border-slate-200 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <p>Pessoa</p>
          <p>Função</p>
          <p>Status</p>
          <p>Último acesso</p>
          <p>Ações</p>
        </div>
        <div>
          {filteredMembers.map((member) => (
            <article key={member.id} className="grid grid-cols-5 items-center px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{member.fullName || member.email}</p>
                <p className="text-slate-500 dark:text-slate-400">{member.email}</p>
              </div>
              <p>{userRoleLabel(member.role)}</p>
              <p className={isOnline(member.lastSeenAt) ? 'text-emerald-600' : 'text-slate-500'}>
                {isOnline(member.lastSeenAt) ? 'Online' : 'Offline'}
              </p>
              <p className="text-slate-500 dark:text-slate-400">{formatLastAccess(member.lastSeenAt)}</p>
              <div>
                {appUser?.role === 'owner' && member.role !== 'owner' ? (
                  <details className="relative">
                    <summary className="inline-flex cursor-pointer list-none items-center rounded px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                      ⋯
                    </summary>
                    <div className="absolute right-0 z-20 mt-1 min-w-48 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-600 dark:bg-slate-800">
                      <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
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
                        className="w-full rounded-md bg-red-50 px-2 py-1.5 text-left text-xs text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
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
      )}
    </Layout>
  )
}
