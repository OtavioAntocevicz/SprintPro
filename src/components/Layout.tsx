import { useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useOnlineUsers } from '../hooks/useOnlineUsers'
import { logout } from '../services/auth'
import { useAuthStore } from '../store/authStore'
import { useHeaderSearchStore } from '../store/headerSearchStore'
import { useSidebarStore } from '../store/sidebarStore'
import { useThemeStore } from '../store/themeStore'
import { userRoleLabel } from '../utils/userRoleLabel'
import {
  IconCompleted,
  IconDashboard,
  IconKanban,
  IconLogout,
  IconMembers,
  IconReports,
  IconSettings,
} from './AppIcons'
import { BrandLogo } from './BrandLogo'
import { Avatar, DropdownMenu } from './ui'
import { initialsOf } from './uiStyles'

type Props = {
  searchPlaceholder?: string
  showSearch?: boolean
  children: React.ReactNode
}

const navItems = [
  { icon: IconDashboard, label: 'Dashboard', to: '/dashboard' },
  { icon: IconKanban, label: 'Quadros', to: '/boards' },
  { icon: IconCompleted, label: 'Concluídos', to: '/completed' },
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

export function Layout({ searchPlaceholder = 'Buscar tarefas...', showSearch = true, children }: Props) {
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

  const initials = initialsOf(appUser?.fullName || appUser?.email)

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
      className={`min-h-screen bg-app text-slate-800 dark:bg-slate-950 dark:text-slate-100 ${
        theme === 'dark' ? 'dark' : ''
      }`}
    >
      <div className="flex min-h-screen">
        <aside
          className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-slate-200 bg-sidebar transition-[width,padding] duration-200 dark:border-slate-800 dark:bg-slate-900 ${
            collapsed ? 'w-[4.5rem] px-2 py-4' : 'w-60 p-5'
          }`}
        >
          <div
            className={`flex shrink-0 ${collapsed ? 'flex-col items-center gap-2' : 'items-start justify-between gap-2'}`}
          >
            {collapsed ? (
              <Link to="/dashboard" title="SprintPro" className="block">
                <img
                  src="/logo.svg"
                  alt="SprintPro"
                  className="mx-auto h-8 w-8 rounded-[22%] shadow-sm"
                />
              </Link>
            ) : (
              <div className="min-w-0 flex-1">
                <Link to="/dashboard" className="inline-flex">
                  <BrandLogo size="lg" />
                </Link>
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                  {appUser?.organizationName ?? 'Workspace'}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={toggleCollapsed}
              title={collapsed ? 'Expandir menu' : 'Recolher menu'}
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
              aria-expanded={!collapsed}
              className={`grid shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${
                collapsed ? 'h-8 w-8' : 'h-8 w-8 self-start'
              }`}
            >
              <SidebarToggleIcon collapsed={collapsed} />
            </button>
          </div>

          <nav aria-label="Navegação principal" className={`flex-1 space-y-1 overflow-y-auto ${collapsed ? 'mt-4' : 'mt-8'}`}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={({ isActive }) => navLinkClass(isActive)}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>

        </aside>

        <main className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 px-6 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex items-center gap-3">
              {showSearch ? (
                <form onSubmit={onSearchSubmit} className="relative min-w-0 flex-1">
                  <svg
                    aria-hidden="true"
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
                    aria-label="Buscar tarefas"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800 dark:focus:ring-violet-950/50"
                  />
                </form>
              ) : (
                <div className="min-w-0 flex-1" />
              )}

              <div
                className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:flex dark:border-slate-700 dark:bg-slate-800"
                title={
                  onlineUsers.length
                    ? `Online agora: ${onlineUsers.map((u) => u.fullName || u.email).join(', ')}`
                    : 'Ninguém online agora'
                }
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {onlineUsers.length} online
                </span>
                <div className="flex -space-x-1.5">
                  {onlineUsers.slice(0, 3).map((user) => (
                    <Avatar
                      key={user.id}
                      name={user.fullName || user.email}
                      size="sm"
                      className="border border-white dark:border-slate-800"
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {theme === 'dark' ? (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
                  </svg>
                )}
              </button>

              <div className="border-l border-slate-200 pl-3 dark:border-slate-700">
                <DropdownMenu
                  triggerLabel="Menu da conta"
                  triggerClassName="flex items-center gap-2.5 rounded-xl py-1 pl-2 pr-1 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800"
                  trigger={
                    <>
                      <span className="hidden text-right sm:block">
                        <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {appUser?.fullName ?? 'Usuário'}
                        </span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                          {userRoleLabel(appUser?.role)}
                        </span>
                      </span>
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-slate-800 text-xs font-bold text-white">
                        {initials}
                      </span>
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </>
                  }
                  header={
                    <>
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {appUser?.fullName ?? 'Usuário'}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{appUser?.email}</p>
                    </>
                  }
                  items={[
                    {
                      label: 'Configurações',
                      icon: <IconSettings className="h-4 w-4" />,
                      onSelect: () => navigate('/settings'),
                    },
                    {
                      label: 'Sair',
                      tone: 'danger',
                      icon: <IconLogout className="h-4 w-4" />,
                      onSelect: () => void logout(),
                    },
                  ]}
                />
              </div>
            </div>
          </header>

          <section className="flex-1 px-6 py-6">{children}</section>
        </main>
      </div>
    </div>
  )
}
