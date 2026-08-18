import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { requestPasswordReset } from '../services/auth'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [resetLink, setResetLink] = useState('')

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setResetLink('')
    setLoading(true)
    try {
      const response = await requestPasswordReset(email.trim().toLowerCase())
      setMessage(response.message)
      if (response.resetLink) {
        setResetLink(response.resetLink)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao solicitar recuperação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <AppHeader />
      <div className="grid place-items-center px-4 py-10">
        <section className="w-full max-w-lg rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Recuperar senha</h1>
          <p className="mt-2 text-sm text-slate-600">
            Informe o e-mail da conta. Enquanto o envio por e-mail não estiver ativo, o link
            de redefinição pode aparecer abaixo (modo temporário).
          </p>

          <form className="mt-4 space-y-3" onSubmit={onSubmit}>
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="voce@empresa.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-violet-600 py-2 font-medium text-white disabled:opacity-60"
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
          </form>

          {message && <p className="mt-3 text-sm text-emerald-600">{message}</p>}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {resetLink && (
            <div className="mt-3 space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
              <p className="font-medium">Link temporário (sem e-mail)</p>
              <a className="block break-all text-violet-700 underline" href={resetLink}>
                {resetLink}
              </a>
              <p className="text-xs text-amber-800">
                Abra o link, defina a nova senha e faça login. Remova{' '}
                <code className="rounded bg-amber-100 px-1">SHOW_PASSWORD_RESET_LINK</code> quando
                o Resend estiver configurado.
              </p>
            </div>
          )}

          <Link to="/login?mode=login" className="mt-4 inline-block text-sm text-slate-600 hover:text-slate-900">
            Voltar para login
          </Link>
        </section>
      </div>
    </div>
  )
}
