import { Navigate } from 'react-router-dom'
import { getToken } from '../lib/apiClient'
import { useAuthStore } from '../store/authStore'

type Props = {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: Props) {
  const { appUser, loading, error } = useAuthStore()
  const hasSession = Boolean(getToken())

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-slate-600">Carregando...</div>
  }

  if (!hasSession) {
    return <Navigate to="/login" replace />
  }

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <p className="text-sm text-red-600">Erro ao carregar perfil: {error}</p>
          <p className="mt-2 text-sm text-slate-600">
            Tente sair e entrar novamente. Se persistir, verifique se a API está a correr (porta 8787 em dev) e a
            `DATABASE_URL` no servidor.
          </p>
        </div>
      </div>
    )
  }

  if (!appUser) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
