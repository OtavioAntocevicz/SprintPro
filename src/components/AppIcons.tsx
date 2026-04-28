type IconProps = {
  className?: string
}

export function IconWelcome({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d="M8 12V6.5a2.5 2.5 0 0 1 5 0V12" stroke="#6D28D9" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6.5 12.2v-1.7a1.6 1.6 0 1 1 3.2 0V12" stroke="#6B7280" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11 12.2v-2a1.6 1.6 0 1 1 3.2 0v2" stroke="#6B7280" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14.2 12.2v-1.4a1.5 1.5 0 1 1 3 0v2.9c0 3-2.4 5.3-5.3 5.3h-.7c-3 0-5.2-2.2-5.2-5.2v-1.6" stroke="#6B7280" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function IconDashboard({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" strokeWidth="1.7">
      <rect x="4" y="4" width="7" height="7" rx="1.5" fill="#7C3AED" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="#6B7280" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="#6B7280" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="#6B7280" />
    </svg>
  )
}

export function IconKanban({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="#6B7280" strokeWidth="1.7">
      <line x1="4" y1="5" x2="4" y2="20" />
      <line x1="12" y1="5" x2="12" y2="20" />
      <line x1="20" y1="5" x2="20" y2="20" />
      <rect x="2.5" y="6" width="3" height="5" rx="1" fill="#7C3AED" stroke="none" />
      <rect x="10.5" y="12" width="3" height="4" rx="1" fill="#7C3AED" stroke="none" />
      <rect x="18.5" y="8" width="3" height="6" rx="1" fill="#9CA3AF" stroke="none" />
    </svg>
  )
}

export function IconMembers({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="8" r="3" fill="#7C3AED" />
      <circle cx="6.5" cy="9.5" r="2.4" fill="#9CA3AF" />
      <circle cx="17.5" cy="9.5" r="2.4" fill="#9CA3AF" />
      <path d="M6.5 18c0-2.7 2.3-4.5 5.5-4.5s5.5 1.8 5.5 4.5" stroke="#6B7280" strokeWidth="1.7" />
    </svg>
  )
}

export function IconReports({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" strokeLinecap="round">
      <path d="M4 4v16h16" stroke="#111827" strokeWidth="1.8" />
      <rect x="7" y="13" width="2.5" height="5" rx="0.8" fill="#9CA3AF" />
      <rect x="11" y="10" width="2.5" height="8" rx="0.8" fill="#9CA3AF" />
      <rect x="15" y="7" width="2.5" height="11" rx="0.8" fill="#9CA3AF" />
      <path d="M8 11l4-3 3 2 4-4" stroke="#7C3AED" strokeWidth="1.8" />
    </svg>
  )
}

export function IconSettings({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="#7C3AED" strokeWidth="1.7">
      <circle cx="12" cy="12" r="2.8" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4.7a7.2 7.2 0 0 0-1.7-1l-.4-2.5h-4l-.4 2.5a7.2 7.2 0 0 0-1.7 1L5.9 6.1l-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-.7c.5.4 1.1.7 1.7 1l.4 2.5h4l.4-2.5c.6-.3 1.2-.6 1.7-1l2.4.7 2-3.4-2-1.5c.1-.4.1-.7.1-1Z" />
    </svg>
  )
}

export function IconAdd({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="#111827" strokeWidth="2.1" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconLogout({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="#64748B" strokeWidth="1.9" strokeLinecap="round">
      <path d="M10 5H5v14h5" />
      <path d="M13 8l4 4-4 4M17 12H8" />
    </svg>
  )
}
