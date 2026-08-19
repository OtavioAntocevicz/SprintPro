type Props = {
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
  className?: string
}

const sizes = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
} as const

const wordmarkSizes = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
} as const

export function BrandLogo({ size = 'md', showWordmark = true, className = '' }: Props) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src="/logo.svg"
        alt=""
        aria-hidden="true"
        className={`${sizes[size]} shrink-0 rounded-[22%] shadow-sm`}
      />
      {showWordmark && (
        <span className={`font-bold text-violet-600 dark:text-violet-400 ${wordmarkSizes[size]}`}>
          SprintPro
        </span>
      )}
    </span>
  )
}
