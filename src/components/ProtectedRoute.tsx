import { Navigate } from 'react-router-dom'
import { getToken } from '../lib/apiClient'
import { useAuthStore } from '../store/authStore'

type Props = {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: Props) {
  const { appUser, loading, error, revalidateSession } = useAuthStore()
  const hasSession = Boolean(getToken())

  if (loading || (hasSession && !appUser && !error)) {
    return <div className="grid min-h-screen place-items-center text-slate-600">Carregando...</div>
  }

  if (!hasSession) {
    return <Navigate to="/login" replace />
  }

  if (!appUser) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div className="max-w-md">
          <p className="text-sm text-red-600">
            {error ? `Erro ao reconectar: ${error}` : 'Não foi possível restaurar sua sessão.'}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Verifique sua conexão e tente novamente. Se o problema persistir, saia e entre de novo.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => void revalidateSession()}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
