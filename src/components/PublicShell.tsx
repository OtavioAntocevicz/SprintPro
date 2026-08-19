import { useEffect, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
}

/** Páginas públicas (landing, login) sempre em modo claro — evita conflito com o tema do app autenticado. */
export function PublicShell({ children, className = '' }: Props) {
  useEffect(() => {
    document.body.dataset.theme = 'light'
    return () => {
      delete document.body.dataset.theme
    }
  }, [])

  return (
    <div className={`min-h-screen bg-slate-100 text-slate-900 ${className}`}>{children}</div>
  )
}
