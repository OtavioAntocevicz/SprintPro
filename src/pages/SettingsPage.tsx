import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ErrorBlock, LoadingBlock } from '../components/AsyncState'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import {
  changePassword,
  createAgentConnection,
  createCategory,
  deleteAgentConnection,
  fetchAgentConnections,
  regenerateAgentConnectionToken,
  setAgentConnectionActive,
  deleteCategory,
  deleteMainAccount,
  fetchCategories,
  fetchMembers,
  updateCategory,
  updateOrganization,
  updateProfile,
} from '../services/apiData'
import { logout } from '../services/auth'
import { useMembersCount } from '../hooks/useMembersCount'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { useAuthStore } from '../store/authStore'
import { pollIntervalForMemberCount } from '../utils/pollInterval'
import { userRoleLabel } from '../utils/userRoleLabel'
import type { AgentConnection, AppUser, TaskCategory } from '../types'
import type { AgentMcpCreateResponse } from '../services/apiData'

type McpTokenReveal = {
  connectionId: string
  connectionLabel: string
  token: string
  mcpEnv: AgentMcpCreateResponse['mcpEnv']
  reason: 'create' | 'regenerate'
}

function formatLastSeen(lastSeenAt?: string) {
  if (!lastSeenAt) return 'Sem atividade registrada'
  const d = new Date(lastSeenAt)
  if (Number.isNaN(d.getTime())) return 'Sem atividade registrada'
  return d.toLocaleString('pt-BR')
}

export function SettingsPage() {
  const appUser = useAuthStore((s) => s.appUser)
  const isOwner = appUser?.role === 'owner'
  const memberCount = useMembersCount(appUser?.organizationId)
  const pollMs = pollIntervalForMemberCount(memberCount)
  const [fullName, setFullName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [members, setMembers] = useState<AppUser[]>([])
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [categoryBusy, setCategoryBusy] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [feedback, setFeedback] = useState('')
  const [agentConnections, setAgentConnections] = useState<AgentConnection[]>([])
  const [agentCounts, setAgentCounts] = useState({ total: 0, active: 0 })
  const [newMcpLabel, setNewMcpLabel] = useState('Cursor')
  const [mcpBusy, setMcpBusy] = useState(false)
  const [mcpLoading, setMcpLoading] = useState(true)
  const [mcpError, setMcpError] = useState('')
  const [mcpMessage, setMcpMessage] = useState('')
  const [tokenReveal, setTokenReveal] = useState<McpTokenReveal | null>(null)
  const [highlightConnectionId, setHighlightConnectionId] = useState<string | null>(null)
  const tokenPanelRef = useRef<HTMLDivElement | null>(null)
  const pwa = usePwaInstall()

  async function loadAgentConnections() {
    if (!appUser?.id) return
    setMcpLoading(true)
    setMcpError('')
    try {
      const data = await fetchAgentConnections()
      setAgentConnections(Array.isArray(data.connections) ? data.connections : [])
      setAgentCounts(data.counts ?? { total: 0, active: 0 })
    } catch (e) {
      setMcpError(e instanceof Error ? e.message : 'Não foi possível carregar as conexões MCP.')
      setAgentConnections([])
      setAgentCounts({ total: 0, active: 0 })
    } finally {
      setMcpLoading(false)
    }
  }

  function revealMcpToken(result: AgentMcpCreateResponse, reason: McpTokenReveal['reason']) {
    setTokenReveal({
      connectionId: result.connection.id,
      connectionLabel: result.connection.label,
      token: result.token,
      mcpEnv: result.mcpEnv,
      reason,
    })
    setHighlightConnectionId(result.connection.id)
    window.setTimeout(() => {
      tokenPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
  }

  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value)
      setMcpMessage(successMessage)
    } catch {
      setMcpMessage('Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.')
    }
  }

  useEffect(() => {
    if (!appUser?.organizationId || !appUser?.id) return
    let cancelled = false
    async function load() {
      try {
        const [membersData, categoriesData] = await Promise.all([fetchMembers(), fetchCategories()])
        if (!cancelled) {
          setMembers(membersData)
          setCategories(categoriesData)
        }
      } catch (e) {
        console.error(e)
      }
    }
    async function refreshAll() {
      await load()
      if (!cancelled) await loadAgentConnections()
    }
    void refreshAll()
    const id = window.setInterval(() => void refreshAll(), pollMs)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [appUser?.organizationId, appUser?.id, pollMs])

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

  async function onAddCategory(event: FormEvent) {
    event.preventDefault()
    if (!isOwner) return
    const name = newCategoryName.trim()
    if (!name) return
    setCategoryBusy(true)
    try {
      const created = await createCategory(name)
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
      setNewCategoryName('')
      setFeedback('Categoria adicionada.')
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Falha ao criar categoria.')
    } finally {
      setCategoryBusy(false)
    }
  }

  async function onSaveCategoryEdit(categoryId: string) {
    if (!isOwner) return
    const name = editingCategoryName.trim()
    if (!name) return
    setCategoryBusy(true)
    try {
      const updated = await updateCategory(categoryId, name)
      setCategories((prev) =>
        prev
          .map((c) => (c.id === categoryId ? updated : c))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      )
      setEditingCategoryId(null)
      setEditingCategoryName('')
      setFeedback('Categoria atualizada.')
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Falha ao atualizar categoria.')
    } finally {
      setCategoryBusy(false)
    }
  }

  async function onDeleteCategory(category: TaskCategory) {
    if (!isOwner) return
    const ok = window.confirm(
      `Excluir a categoria "${category.name}"? As tarefas que já usam esse nome mantêm o rótulo.`,
    )
    if (!ok) return
    setCategoryBusy(true)
    try {
      await deleteCategory(category.id)
      setCategories((prev) => prev.filter((c) => c.id !== category.id))
      if (editingCategoryId === category.id) {
        setEditingCategoryId(null)
        setEditingCategoryName('')
      }
      setFeedback('Categoria excluída.')
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Falha ao excluir categoria.')
    } finally {
      setCategoryBusy(false)
    }
  }

  async function onCreateMcpConnection(event: FormEvent) {
    event.preventDefault()
    const label = newMcpLabel.trim()
    if (!label) return
    setMcpBusy(true)
    setMcpMessage('')
    try {
      const result = await createAgentConnection(label)
      await loadAgentConnections()
      revealMcpToken(result, 'create')
      setMcpMessage(`Conexão "${result.connection.label}" criada. Copie o token abaixo — ele não será exibido de novo.`)
    } catch (e) {
      setMcpMessage(e instanceof Error ? e.message : 'Não foi possível criar a conexão MCP.')
    } finally {
      setMcpBusy(false)
    }
  }

  async function onRegenerateMcpToken(connection: AgentConnection) {
    const ok = window.confirm(
      `Gerar um novo token para "${connection.label}"? O token anterior deixa de funcionar na hora.`,
    )
    if (!ok) return
    setMcpBusy(true)
    setMcpMessage('')
    try {
      const result = await regenerateAgentConnectionToken(connection.id)
      await loadAgentConnections()
      revealMcpToken(result, 'regenerate')
      setMcpMessage(`Novo token gerado para "${connection.label}". Atualize o agente (Cursor/GrokBot).`)
    } catch (e) {
      setMcpMessage(e instanceof Error ? e.message : 'Falha ao gerar novo token.')
    } finally {
      setMcpBusy(false)
    }
  }

  async function onToggleMcpConnection(connection: AgentConnection) {
    const isLive = connection.active && !connection.revokedAt
    setMcpBusy(true)
    setMcpMessage('')
    try {
      await setAgentConnectionActive(connection.id, !isLive)
      await loadAgentConnections()
      if (isLive && tokenReveal?.connectionId === connection.id) {
        setTokenReveal(null)
      }
      setMcpMessage(
        isLive
          ? `Conexão "${connection.label}" desativada. O token não aceita mais chamadas.`
          : `Conexão "${connection.label}" reativada.`,
      )
    } catch (e) {
      setMcpMessage(e instanceof Error ? e.message : 'Falha ao atualizar conexão.')
    } finally {
      setMcpBusy(false)
    }
  }

  async function onDeleteMcpConnection(connection: AgentConnection) {
    if (
      !window.confirm(
        `Excluir "${connection.label}"? O token deixa de funcionar imediatamente e a conexão some da lista.`,
      )
    ) {
      return
    }
    setMcpBusy(true)
    setMcpMessage('')
    try {
      await deleteAgentConnection(connection.id)
      if (tokenReveal?.connectionId === connection.id) {
        setTokenReveal(null)
      }
      if (highlightConnectionId === connection.id) {
        setHighlightConnectionId(null)
      }
      await loadAgentConnections()
      setMcpMessage(`Conexão "${connection.label}" excluída. Remova ou atualize o token no seu agente.`)
    } catch (e) {
      setMcpMessage(e instanceof Error ? e.message : 'Falha ao excluir conexão.')
    } finally {
      setMcpBusy(false)
    }
  }

  const mcpEnvText = tokenReveal
    ? `SPRINTPRO_TOKEN=${tokenReveal.mcpEnv.SPRINTPRO_TOKEN}\nSPRINTPRO_API_URL=${tokenReveal.mcpEnv.SPRINTPRO_API_URL}`
    : ''

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
    if (!isOwner) return
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
    <Layout showSearch={false}>
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
                disabled={!isOwner}
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
              disabled={!isOwner}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Salvar organização
            </button>
          </form>
        </article>
      </section>

      <section className="mt-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Aplicativo (PWA)</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Instale o SprintPro no computador ou celular para abrir como app, com ícone na área de trabalho ou tela
            inicial.
          </p>

          {pwa.installed ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              ✓ SprintPro já está instalado neste dispositivo
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  pwa.clearFeedback()
                  void pwa.install()
                }}
                disabled={pwa.installing}
                className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {pwa.installing ? 'Instalando...' : 'Instalar SprintPro'}
              </button>
              {pwa.canPromptInstall && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400">Pronto para instalar</span>
              )}
            </div>
          )}

          {pwa.isIos && !pwa.installed && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              iOS: Safari → Compartilhar → Adicionar à Tela de Início.
            </p>
          )}

          {pwa.feedback && (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{pwa.feedback}</p>
          )}
        </article>
      </section>

      <section className="mt-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Categorias</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pré-defina lojas ou áreas (ex.: Toyama, Aquabrazil) para agilizar a criação e o filtro de tarefas.
          </p>

          {isOwner && (
            <form onSubmit={onAddCategory} className="mt-3 flex flex-wrap gap-2">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nome da categoria"
                className="min-w-[12rem] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={categoryBusy || !newCategoryName.trim()}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Adicionar
              </button>
            </form>
          )}

          {categories.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Nenhuma categoria cadastrada. Cadastre lojas ou áreas para agilizar a criação de tarefas.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {categories.map((category) => (
                <li key={category.id} className="flex flex-wrap items-center gap-2 py-3">
                  {editingCategoryId === category.id ? (
                    <>
                      <input
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        className="min-w-[10rem] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        disabled={categoryBusy || !editingCategoryName.trim()}
                        onClick={() => void onSaveCategoryEdit(category.id)}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategoryId(null)
                          setEditingCategoryName('')
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-300"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                        {category.name}
                      </span>
                      {isOwner && (
                        <>
                          <button
                            type="button"
                            disabled={categoryBusy}
                            onClick={() => {
                              setEditingCategoryId(category.id)
                              setEditingCategoryName(category.name)
                            }}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-300"
                          >
                            Renomear
                          </button>
                          <button
                            type="button"
                            disabled={categoryBusy}
                            onClick={() => void onDeleteCategory(category)}
                            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 dark:bg-red-950 dark:text-red-400"
                          >
                            Excluir
                          </button>
                        </>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="mt-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Conexões MCP (agentes)</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Conexões desta conta ({appUser?.email}). Cursor, GrokBot e outros agentes com o servidor
                SprintPro MCP.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={mcpLoading || mcpBusy}
                onClick={() => void loadAgentConnections()}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-600"
              >
                Atualizar lista
              </button>
              <div className="rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                {agentCounts.active} ativa{agentCounts.active === 1 ? '' : 's'} · {agentCounts.total} no total
              </div>
            </div>
          </div>

          {mcpMessage && (
            <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {mcpMessage}
            </p>
          )}

          <form onSubmit={onCreateMcpConnection} className="mt-4 flex flex-wrap items-end gap-2">
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-slate-600 dark:text-slate-400">
              Nome da conexão
              <input
                value={newMcpLabel}
                onChange={(e) => setNewMcpLabel(e.target.value)}
                placeholder="Ex.: Cursor, GrokBot"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
            <button
              type="submit"
              disabled={mcpBusy}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {mcpBusy ? 'Aguarde…' : 'Nova conexão'}
            </button>
          </form>

          {tokenReveal && (
            <div
              ref={tokenPanelRef}
              className="mt-4 rounded-xl border border-amber-300 bg-amber-50/95 p-4 dark:border-amber-800 dark:bg-amber-950/50"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                    {tokenReveal.reason === 'create' ? 'Nova conexão' : 'Novo token'} —{' '}
                    {tokenReveal.connectionLabel}
                  </p>
                  <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-200/90">
                    Válido por 365 dias. Guarde em local seguro; não será mostrado de novo nesta tela.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTokenReveal(null)}
                  className="text-xs text-amber-900 underline dark:text-amber-200"
                >
                  Já copiei, fechar
                </button>
              </div>
              <label className="mt-3 block text-xs font-medium text-amber-950 dark:text-amber-100">
                Token (SPRINTPRO_TOKEN)
                <textarea
                  readOnly
                  value={tokenReveal.token}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-2 py-2 font-mono text-[11px] dark:border-amber-800 dark:bg-slate-950"
                  onFocus={(e) => e.currentTarget.select()}
                />
              </label>
              <label className="mt-2 block text-xs font-medium text-amber-950 dark:text-amber-100">
                Variáveis para o agente
                <textarea
                  readOnly
                  value={mcpEnvText}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-2 py-2 font-mono text-[11px] dark:border-amber-800 dark:bg-slate-950"
                  onFocus={(e) => e.currentTarget.select()}
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyText(tokenReveal.token, 'Token copiado.')}
                  className="rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-medium text-white dark:bg-amber-700"
                >
                  Copiar token
                </button>
                <button
                  type="button"
                  onClick={() => void copyText(mcpEnvText, 'Variáveis copiadas.')}
                  className="rounded-lg border border-amber-700 px-3 py-1.5 text-xs text-amber-950 dark:text-amber-100"
                >
                  Copiar env
                </button>
              </div>
            </div>
          )}

          {mcpLoading ? (
            <LoadingBlock label="Carregando conexões MCP…" className="mt-4 py-8" />
          ) : mcpError ? (
            <ErrorBlock message={mcpError} onRetry={() => void loadAgentConnections()} className="mt-4" />
          ) : agentConnections.length === 0 ? (
            <div className="mt-4 space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <p>Nenhuma conexão registrada para esta conta.</p>
              <p className="text-xs">
                Se o agente já funciona com um token antigo (antes do registro na lista), crie uma nova
                conexão aqui ou use <strong>Novo token</strong> após criar — tokens antigos sem registro não
                aparecem nesta lista.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-700">
              {agentConnections.map((connection) => {
                const isLive = connection.active && !connection.revokedAt
                const highlighted = highlightConnectionId === connection.id
                return (
                  <li
                    key={connection.id}
                    className={`flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 ${
                      highlighted ? 'rounded-lg bg-violet-50/80 px-2 dark:bg-violet-950/30' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{connection.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Criada em {formatLastSeen(connection.createdAt)}
                        {connection.lastUsedAt
                          ? ` · Último uso ${formatLastSeen(connection.lastUsedAt)}`
                          : ' · Ainda não usada'}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        isLive
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isLive ? 'Ativa' : 'Desativada'}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={mcpBusy}
                        onClick={() => void onRegenerateMcpToken(connection)}
                        className="rounded-lg border border-violet-300 px-3 py-1.5 text-xs text-violet-800 dark:border-violet-700 dark:text-violet-200"
                      >
                        Novo token
                      </button>
                      <button
                        type="button"
                        disabled={mcpBusy}
                        onClick={() => void onToggleMcpConnection(connection)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-600"
                      >
                        {isLive ? 'Desativar' : 'Reativar'}
                      </button>
                      <button
                        type="button"
                        disabled={mcpBusy}
                        onClick={() => void onDeleteMcpConnection(connection)}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 dark:bg-red-950 dark:text-red-400"
                      >
                        Excluir
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
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
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Tokens de agentes MCP são geridos na seção <strong>Conexões MCP</strong> acima.
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
                disabled={!isOwner}
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
