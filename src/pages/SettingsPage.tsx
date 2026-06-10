import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import {
  changePassword,
  deleteMainAccount,
  fetchMembers,
  updateOrganization,
  updateProfile,
} from '../services/apiData'
import { logout } from '../services/auth'
import { useAuthStore } from '../store/authStore'
import { userRoleLabel } from '../utils/userRoleLabel'
import type { AppUser } from '../types'

function formatLastSeen(lastSeenAt?: string) {
  if (!lastSeenAt) return 'Sem atividade registrada'
  const d = new Date(lastSeenAt)
  if (Number.isNaN(d.getTime())) return 'Sem atividade registrada'
  return d.toLocaleString('pt-BR')
}

export function SettingsPage() {
  const appUser = useAuthStore((s) => s.appUser)
  const [fullName, setFullName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [members, setMembers] = useState<AppUser[]>([])
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (!appUser?.organizationId) return
    let cancelled = false
    async function load() {
      try {
        const data = await fetchMembers()
        if (!cancelled) setMembers(data)
      } catch (e) {
        console.error(e)
      }
    }
    void load()
    const id = window.setInterval(() => void load(), 12000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [appUser?.organizationId])

  const membersWithFavoritePermission = useMemo(
    () => members.filter((m) => m.role === 'owner' || m.canFavorite).length,
    [members],
  )

  async function onSaveProfile(event: FormEvent) {
    event.preventDefault()
    const nextName = fullName.trim() || appUser?.fullName || ''
    if (!nextName) return
    try {
      const updated = await updateProfile(nextName)
      useAuthStore.setState((state) => ({
        ...state,
        appUser: state.appUser ? { ...state.appUser, fullName: updated.fullName } : state.appUser,
      }))
      setFeedback('Perfil atualizado com sucesso.')
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Falha ao atualizar perfil.')
    }
  }

  async function onSaveOrg(event: FormEvent) {
    event.preventDefault()
    const nextOrgName = orgName.trim() || appUser?.organizationName || ''
    if (!nextOrgName) return
    try {
      const updated = await updateOrganization(nextOrgName)
      useAuthStore.setState((state) => ({
        ...state,
        appUser: state.appUser
          ? { ...state.appUser, organizationName: updated.name }
          : state.appUser,
      }))
      setFeedback('Organização atualizada com sucesso.')
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Falha ao atualizar organização.')
    }
  }

  async function onChangePassword(event: FormEvent) {
    event.preventDefault()
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(newPassword)) {
      setFeedback('A nova senha deve ter no mínimo 8 caracteres com letras e números.')
      return
    }
    if (newPassword !== confirmPassword) {
      setFeedback('Confirmação de senha não confere.')
      return
    }
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setFeedback('Senha alterada com sucesso.')
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Falha ao alterar senha.')
    }
  }

  async function onDeleteMainAccount() {
    if (appUser?.role !== 'owner') return
    const ok = window.confirm(
      'Esta ação exclui a organização e todos os colaboradores/tarefas. Deseja continuar?',
    )
    if (!ok) return
    try {
      await deleteMainAccount()
      logout()
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Falha ao excluir conta principal.')
    }
  }

  return (
    <Layout searchPlaceholder="Configurações">
      <section className="mb-6">
        <h1 className="text-4xl font-semibold">Configurações</h1>
        <p className="text-slate-500 dark:text-slate-400">Gerencie perfil, organização, equipe e segurança da conta.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Perfil</h2>
          <form onSubmit={onSaveProfile} className="mt-3 space-y-3">
            <div>
              <label className="text-sm text-slate-600 dark:text-slate-400">Nome completo</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                placeholder={appUser?.fullName ?? ''}
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 dark:text-slate-400">Email</label>
              <input
                value={appUser?.email ?? ''}
                readOnly
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 dark:text-slate-400">Função</label>
              <input
                value={userRoleLabel(appUser?.role)}
                readOnly
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              />
            </div>
            <button className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white">
              Salvar perfil
            </button>
          </form>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Organização</h2>
          <form onSubmit={onSaveOrg} className="mt-3 space-y-3">
            <div>
              <label className="text-sm text-slate-600 dark:text-slate-400">Nome da empresa</label>
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={appUser?.role !== 'owner'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 disabled:bg-slate-50 disabled:text-slate-400 dark:disabled:bg-slate-900 dark:disabled:text-slate-500"
                placeholder={appUser?.organizationName ?? ''}
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 dark:text-slate-400">Plano</label>
              <input
                value="MVP Free"
                readOnly
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 dark:text-slate-400">ID da Organização</label>
              <input
                value={appUser?.organizationId ?? ''}
                readOnly
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              />
            </div>
            <button
              disabled={appUser?.role !== 'owner'}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Salvar organização
            </button>
          </form>
        </article>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Equipe e permissões</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Atalho: <Link to="/members" className="font-medium text-violet-600 hover:underline dark:text-violet-400">Abrir Membros</Link>
          </p>
          <ul className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-300">
            <li>Total de membros: {members.length}</li>
            <li>Com permissão de favoritar: {membersWithFavoritePermission}</li>
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Segurança</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Último acesso da conta atual: {formatLastSeen(appUser?.lastSeenAt)}
          </p>
          <form onSubmit={onChangePassword} className="mt-3 space-y-2">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Senha atual"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nova senha"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar nova senha"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">Use pelo menos 8 caracteres com letras e números.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white">
                Alterar senha
              </button>
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 dark:border-slate-600 dark:text-slate-300"
              >
                Encerrar sessão
              </button>
              <button
                type="button"
                disabled={appUser?.role !== 'owner'}
                onClick={() => void onDeleteMainAccount()}
                className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 disabled:opacity-50 dark:bg-red-950 dark:text-red-400"
                title="Exclui empresa, colaboradores e dados da organização"
              >
                Excluir conta principal
              </button>
            </div>
          </form>
        </article>
      </section>

      {feedback && <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">{feedback}</p>}
    </Layout>
  )
}
