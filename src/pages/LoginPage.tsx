import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { loginOwner, registerOwner } from '../services/auth'

type AuthMode = 'login' | 'signup'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialMode: AuthMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [fullName, setFullName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const submitLock = useRef(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitLock.current || loading) {
      return
    }
    submitLock.current = true
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const cleanEmail = email.trim().toLowerCase()

      if (mode === 'signup') {
        if (!fullName.trim()) throw new Error('Informe seu nome completo.')
        if (!organizationName.trim()) throw new Error('Informe o nome da organização.')
        if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
          throw new Error('A senha deve ter no mínimo 8 caracteres com letras e números.')
        }
        if (password !== confirmPassword) throw new Error('As senhas não coincidem.')
        await registerOwner({
          email: cleanEmail,
          password,
          fullName: fullName.trim(),
          organizationName: organizationName.trim(),
        })
        setMessage('Conta criada com sucesso.')
      } else {
        await loginOwner(cleanEmail, password)
        setMessage('Login realizado com sucesso.')
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na autenticação.')
    } finally {
      setLoading(false)
      submitLock.current = false
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <AppHeader />
      <div className="grid place-items-center px-4 py-10">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md rounded-xl bg-white p-6 shadow-sm"
        >
        <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`rounded-md px-3 py-1.5 text-sm ${mode === 'login' ? 'bg-white text-slate-900' : 'text-slate-600'}`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`rounded-md px-3 py-1.5 text-sm ${mode === 'signup' ? 'bg-white text-slate-900' : 'text-slate-600'}`}
          >
            Criar conta
          </button>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {mode === 'signup' ? 'Comece agora' : 'Bem-vindo de volta'}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {mode === 'signup'
            ? 'Crie sua conta e organize seu time.'
            : 'Entre com suas credenciais para acessar.'}
        </p>
        {mode === 'signup' && (
          <>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Nome completo
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="João Silva"
            />
          </>
        )}
        <label className="mt-4 block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="voce@empresa.com"
        />
        {mode === 'signup' && (
          <>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Nome da organização
            </label>
            <input
              type="text"
              required
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Minha Empresa"
            />
          </>
        )}
        <label className="mt-3 block text-sm font-medium text-slate-700">Senha</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Min. 6 caracteres"
        />
        {mode === 'login' && (
          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-sm text-violet-600 hover:text-violet-500"
            >
              Esqueci minha senha
            </button>
          </div>
        )}
        {mode === 'signup' && (
          <>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Confirmar senha
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Repita a senha"
            />
            <p className="mt-2 text-xs text-slate-500">Mínimo de 8 caracteres com letras e números</p>
          </>
        )}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-violet-600 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {loading
            ? 'Processando...'
            : mode === 'signup'
              ? 'Criar conta'
              : 'Entrar'}
        </button>
        {message && <p className="mt-3 text-sm text-emerald-600">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <p className="mt-4 text-xs text-slate-500">
          Quem cria a conta e a organização entra como <strong>gestor</strong>. <strong>Colaboradores</strong> entram
          pelo link de convite. Painel de administrador da plataforma (e papéis avançados) vêm em versão futura.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block text-sm text-slate-600 hover:text-slate-900"
        >
          Voltar
        </Link>
        </form>
      </div>
    </div>
  )
}
