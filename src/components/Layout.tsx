import { useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useOnlineUsers } from '../hooks/useOnlineUsers'
import { logout } from '../services/auth'
import { useAuthStore } from '../store/authStore'
import { useHeaderSearchStore } from '../store/headerSearchStore'
import { useSidebarStore } from '../store/sidebarStore'
import { useThemeStore } from '../store/themeStore'
import { userRoleLabel } from '../utils/userRoleLabel'
import {
  IconDashboard,
  IconKanban,
  IconLogout,
  IconMembers,
  IconReports,
  IconSettings,
} from './AppIcons'

type Props = {
  searchPlaceholder?: string
  children: React.ReactNode
}

const navItems = [
  { icon: IconDashboard, label: 'Dashboard', to: '/dashboard' },
  { icon: IconKanban, label: 'Quadros', to: '/boards' },
  { icon: IconMembers, label: 'Membros', to: '/members' },
  { icon: IconReports, label: 'Relatórios', to: '/reports' },
  { icon: IconSettings, label: 'Configurações', to: '/settings' },
]

function SidebarToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      {collapsed ? (
        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}

export function Layout({ searchPlaceholder = 'Buscar tarefas...', children }: Props) {
  const navigate = useNavigate()
  const appUser = useAuthStore((state) => state.appUser)
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const collapsed = useSidebarStore((state) => state.collapsed)
  const toggleCollapsed = useSidebarStore((state) => state.toggleCollapsed)
  const onlineUsers = useOnlineUsers(appUser?.organizationId)
  const query = useHeaderSearchStore((s) => s.query)
  const setQuery = useHeaderSearchStore((s) => s.setQuery)

  useEffect(() => {
    document.body.dataset.theme = theme
    return () => {
      delete document.body.dataset.theme
    }
  }, [theme])

  const initials = (appUser?.fullName || appUser?.email || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const navLinkClass = (isActive: boolean) =>
    `flex items-center rounded-lg text-sm font-medium transition-colors ${
      collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2'
    } ${
      isActive
        ? 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
    }`

  function onSearchSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (query.trim()) {
      navigate('/boards')
    }
  }

  return (
    <div
      className={`min-h-screen bg-[#f4f5fa] text-slate-800 dark:bg-slate-950 dark:text-slate-100 ${
        theme === 'dark' ? 'dark' : ''
      }`}
    >
      <div className="flex min-h-screen">
        <aside
          className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-slate-200 bg-[#f7f8fc] transition-[width,padding] duration-200 dark:border-slate-800 dark:bg-slate-900 ${
            collapsed ? 'w-[4.5rem] px-2 py-4' : 'w-60 p-5'
          }`}
        >
          <div
            className={`flex shrink-0 ${collapsed ? 'flex-col items-center gap-2' : 'items-start justify-between gap-2'}`}
          >
            {collapsed ? (
              <p className="text-sm font-bold text-violet-600 dark:text-violet-400" title="SprintPro">
                SP
              </p>
            ) : (
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">SprintPro</p>
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                  {appUser?.organizationName ?? 'Workspace'}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={toggleCollapsed}
              title={collapsed ? 'Expandir menu' : 'Recolher menu'}
              className={`grid shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${
                collapsed ? 'h-8 w-8' : 'h-8 w-8 self-start'
              }`}
            >
              <SidebarToggleIcon collapsed={collapsed} />
            </button>
          </div>

          <nav className={`flex-1 space-y-1 overflow-y-auto ${collapsed ? 'mt-4' : 'mt-8'}`}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) => navLinkClass(isActive)}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => logout()}
            title="Sair"
            className={`mt-4 flex shrink-0 items-center rounded-lg border border-slate-300 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 ${
              collapsed ? 'justify-center p-2.5' : 'justify-center gap-2 px-4 py-2'
            }`}
          >
            <IconLogout className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </aside>

        <main className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 px-6 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex items-center gap-3">
              <form onSubmit={onSearchSubmit} className="relative min-w-0 flex-1">
                <svg
                  viewBox="0 0 24 24"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3-3" strokeLinecap="round" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800 dark:focus:ring-violet-950/50"
                />
              </form>

              <div
                className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:flex dark:border-slate-700 dark:bg-slate-800"
                title="Pessoas online agora"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {onlineUsers.length} online
                </span>
                <div className="flex -space-x-1.5">
                  {onlineUsers.slice(0, 3).map((user) => {
                    const userInitials = (user.fullName || user.email || 'U')
                      .split(' ')
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                    return (
                      <span
                        key={user.id}
                        title={user.fullName || user.email}
                        className="grid h-6 w-6 place-items-center rounded-full border border-white bg-violet-100 text-[9px] font-semibold text-violet-700 dark:border-slate-800 dark:bg-violet-950 dark:text-violet-300"
                      >
                        {userInitials}
                      </span>
                    )
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {theme === 'dark' ? (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
                  </svg>
                )}
              </button>

              <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3 dark:border-slate-700">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {appUser?.fullName ?? 'Usuário'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{userRoleLabel(appUser?.role)}</p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-slate-800 text-xs font-bold text-white">
                  {initials}
                </div>
              </div>
            </div>
          </header>

          <section className="flex-1 px-6 py-6">{children}</section>
        </main>
      </div>
    </div>
  )
}
