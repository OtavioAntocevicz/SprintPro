import { Link } from 'react-router-dom'
import { logout } from '../services/auth'
import { useAuthStore } from '../store/authStore'

type Props = {
  appMode?: boolean
}

export function AppHeader({ appMode = false }: Props) {
  const appUser = useAuthStore((state) => state.appUser)

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <Link
          to={appMode ? '/dashboard' : '/'}
          className="text-lg font-bold text-violet-600"
        >
          SprintPro
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
          <a href="/#recursos" className="hover:text-violet-600">
            Recursos
          </a>
          <a href="/#como-funciona" className="hover:text-violet-600">
            Como funciona
          </a>
          <a href="/#planos" className="hover:text-violet-600">
            Planos
          </a>
          <a href="/#faq" className="hover:text-violet-600">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {!appMode && (
            <>
              <Link
                to="/login?mode=login"
                className="rounded-md px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-100"
              >
                Entrar
              </Link>
              <Link
                to="/login?mode=signup"
                className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-semibold !text-white hover:bg-violet-500"
              >
                Criar conta
              </Link>
            </>
          )}
          {appMode && appUser && (
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white"
            >
              Sair
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
