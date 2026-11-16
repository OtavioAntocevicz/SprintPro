import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { PublicShell } from '../components/PublicShell'
import { apiFetchJson, getToken } from '../lib/apiClient'

type AuthorizeInfo = {
  clientName: string
  redirectHost: string
  user: { fullName: string; email: string }
  organization: { name: string }
}

const PARAM_KEYS = [
  'client_id',
  'redirect_uri',
  'response_type',
  'code_challenge',
  'code_challenge_method',
  'state',
  'scope',
  'resource',
] as const

/** Tela de consentimento do OAuth: um agente (ex.: Claude) pede acesso ao SprintPro da pessoa. */
export function OAuthAuthorizePage() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [info, setInfo] = useState<AuthorizeInfo | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const hasSession = Boolean(getToken())

  const params = useMemo(() => {
    const p: Record<string, string> = {}
    for (const k of PARAM_KEYS) {
      const v = searchParams.get(k)
      if (v !== null) p[k] = v
    }
    return p
  }, [searchParams])

  useEffect(() => {
    if (!hasSession) return
    const qs = new URLSearchParams(params).toString()
    apiFetchJson<AuthorizeInfo>('GET', `/api/oauth/authorize/info?${qs}`)
      .then(setInfo)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Não foi possível carregar a autorização.'))
  }, [hasSession, params])

  if (!hasSession) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }

  async function decide(approve: boolean) {
    setSubmitting(true)
    setError('')
    try {
      const r = await apiFetchJson<{ redirectUrl: string }>('POST', '/api/oauth/authorize/decision', {
        params,
        approve,
      })
      window.location.assign(r.redirectUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao concluir a autorização.')
      setSubmitting(false)
    }
  }

  return (
    <PublicShell>
      <div className="grid min-h-screen place-items-center px-4 py-10">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex justify-center">
            <BrandLogo />
          </div>

          {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          {!info && !error && <p className="text-center text-sm text-slate-600">Carregando...</p>}

          {info && (
            <>
              <h1 className="text-center text-lg font-semibold text-slate-900">
                {info.clientName} quer acessar seu SprintPro
              </h1>
              <p className="mt-2 text-center text-sm text-slate-600">
                Conectado como <strong>{info.user.fullName}</strong> ({info.user.email}) na organização{' '}
                <strong>{info.organization.name}</strong>.
              </p>

              <ul className="mt-5 space-y-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                <li>• Ver quadros, membros, categorias e tarefas da organização</li>
                <li>• Criar, editar e concluir tarefas e anotações em seu nome</li>
              </ul>

              <p className="mt-4 text-xs text-slate-500">
                Depois de permitir, você será levado de volta para <strong>{info.redirectHost}</strong>. Você pode
                revogar este acesso a qualquer momento em Configurações → Conexões MCP.
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void decide(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void decide(true)}
                  className="flex-1 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {submitting ? 'Conectando...' : 'Permitir'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </PublicShell>
  )
}
