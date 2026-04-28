import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { resetPassword } from '../services/auth'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!token) {
      setError('Token de recuperação inválido. Solicite um novo link.')
      return
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(newPassword)) {
      setError('A senha deve ter no mínimo 8 caracteres com letras e números.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    setLoading(true)
    try {
      await resetPassword(token, newPassword)
      setMessage('Senha redefinida com sucesso. Você já pode entrar.')
      window.setTimeout(() => navigate('/login?mode=login'), 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <AppHeader />
      <div className="grid place-items-center px-4 py-10">
        <section className="w-full max-w-lg rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Redefinir senha</h1>
          <p className="mt-2 text-sm text-slate-600">
            Defina uma nova senha para sua conta.
          </p>

          <form className="mt-4 space-y-3" onSubmit={onSubmit}>
            <div>
              <label className="text-sm font-medium text-slate-700">Nova senha</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Mínimo 8 caracteres com letras e números"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Confirmar nova senha</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-violet-600 py-2 font-medium text-white disabled:opacity-60"
            >
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>

          {message && <p className="mt-3 text-sm text-emerald-600">{message}</p>}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <Link to="/login?mode=login" className="mt-4 inline-block text-sm text-slate-600 hover:text-slate-900">
            Voltar para login
          </Link>
        </section>
      </div>
    </div>
  )
}
