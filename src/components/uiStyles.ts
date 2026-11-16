/** Classes e helpers visuais compartilhados (separados de ui.tsx por causa do fast refresh). */

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-violet-500 dark:focus:ring-violet-950/50'

export const labelClass = 'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300'

export const cardClass =
  'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900'

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60'

export const buttonClass = {
  primary: `${buttonBase} bg-violet-600 text-white hover:bg-violet-500`,
  secondary: `${buttonBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800`,
  danger: `${buttonBase} bg-red-600 text-white hover:bg-red-500`,
  ghost: `${buttonBase} text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`,
} as const

export function initialsOf(name?: string | null) {
  return (name || 'U')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
