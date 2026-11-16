import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { initialsOf } from './uiStyles'


/* ------------------------------------------------------------------ */
/* Classes compartilhadas                                              */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Cabeçalho de página                                                 */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  subtitle,
  actions,
  className = 'mb-6',
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <section className={`flex flex-wrap items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
        {subtitle && <p className="mt-1 text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </section>
  )
}

export function SectionTitle({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */

const avatarSizes = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-xs',
} as const

export function Avatar({
  name,
  size = 'sm',
  className = '',
}: {
  name?: string | null
  size?: keyof typeof avatarSizes
  className?: string
}) {
  return (
    <span
      title={name ?? undefined}
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-violet-100 font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300 ${avatarSizes[size]} ${className}`}
    >
      {initialsOf(name)}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

const modalSizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' } as const

type ModalProps = {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  size?: keyof typeof modalSizes
  /** Quando false, Esc/clique fora não fecham (ex.: durante um salvamento). */
  dismissible?: boolean
  role?: 'dialog' | 'alertdialog'
  footer?: ReactNode
  children?: ReactNode
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  dismissible = true,
  role = 'dialog',
  footer,
  children,
}: ModalProps) {
  const titleId = useId()
  const descId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && dismissible) onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, dismissible])

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    const first = panel.querySelector<HTMLElement>('[data-autofocus], input, textarea, select')
    first?.focus()
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-[2px] dark:bg-black/60"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && dismissible) onClose()
      }}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={`flex max-h-[90vh] w-full ${modalSizes[size]} flex-col rounded-2xl bg-white shadow-xl dark:border dark:border-slate-700 dark:bg-slate-900`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 pb-4 pt-5 dark:border-slate-800">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            {description && (
              <div id={descId} className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {description}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!dismissible}
            aria-label="Fechar"
            title="Fechar (Esc)"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Menu suspenso                                                       */
/* ------------------------------------------------------------------ */

export type MenuItem = {
  label: ReactNode
  onSelect: () => void
  tone?: 'default' | 'danger'
  icon?: ReactNode
}

export function DropdownMenu({
  trigger,
  triggerLabel,
  triggerClassName,
  items,
  header,
  align = 'right',
}: {
  trigger: ReactNode
  triggerLabel: string
  triggerClassName?: string
  items: MenuItem[]
  header?: ReactNode
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label={triggerLabel}
        title={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={
          triggerClassName ??
          'grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
        }
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-30 mt-1 min-w-[12rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {header && (
            <div className="border-b border-slate-100 px-3 pb-2 pt-1.5 dark:border-slate-800">{header}</div>
          )}
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                item.tone === 'danger'
                  ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50'
                  : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function IconDots({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  )
}
