import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { registerWithInvite } from '../services/auth'

export function AcceptInvitePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteId = searchParams.get('invite')?.trim() ?? ''
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
      setError('A senha deve ter no mínimo 8 caracteres com letras e números.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (!inviteId) {
      setError('Falta o id do convite no link. Peça o gestor o link completo (parâmetro ?invite=).')
      return
    }
    setLoading(true)
    try {
      await registerWithInvite({
        inviteId,
        email: email.trim().toLowerCase(),
        password,
        fullName: fullName.trim(),
      })
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao aceitar convite.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <AppHeader />
      <div className="grid place-items-center px-4 py-10">
        <section className="w-full max-w-lg rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Aceitar convite</h1>
          <p className="mt-2 text-sm text-slate-600">
            Crie a sua palavra-passe e complete o registo. O email tem de ser o mesmo do convite.
          </p>

          {!inviteId && (
            <p className="mt-3 text-sm text-amber-700">Abra o link completo que o gestor enviou, com ?invite=…</p>
          )}

          <form className="mt-4 space-y-3" onSubmit={onSubmit}>
            <div>
              <label className="text-sm font-medium text-slate-700">Nome completo</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Email (do convite)</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Confirmar senha</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inviteId}
              className="w-full rounded-lg bg-violet-600 py-2 font-medium text-white disabled:opacity-60"
            >
              {loading ? 'A criar conta…' : 'Entrar no workspace'}
            </button>
          </form>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </section>
      </div>
    </div>
  )
}
