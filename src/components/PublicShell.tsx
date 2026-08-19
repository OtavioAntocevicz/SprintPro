import { useEffect, type ReactNode } from 'react'
import { useThemeStore } from '../store/themeStore'

type Props = {
  children: ReactNode
  className?: string
}

export function PublicShell({ children, className = '' }: Props) {
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    document.body.dataset.theme = theme
    return () => {
      delete document.body.dataset.theme
    }
  }, [theme])

  return (
    <div
      className={`min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100 ${
        theme === 'dark' ? 'dark' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
