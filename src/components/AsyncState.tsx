type LoadingProps = {
  label?: string
  className?: string
}

type ErrorProps = {
  message: string
  onRetry?: () => void
  className?: string
}

export function LoadingBlock({ label = 'Carregando...', className = '' }: LoadingProps) {
  return (
    <div
      className={`flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-12 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600 dark:border-violet-900 dark:border-t-violet-400" />
      {label}
    </div>
  )
}

export function ErrorBlock({ message, onRetry, className = '' }: ErrorProps) {
  return (
    <div
      className={`rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200 ${className}`}
      role="alert"
    >
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-100 dark:hover:bg-red-800"
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}
