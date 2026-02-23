import React from 'react'
import Link from 'next/link'
import { Menu, ChevronRight, ChevronLeft, Moon, Sun, Bell, ChevronDown, User, Settings, Shield, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useTheme } from 'next-themes'
import { NotificationDropdown } from './NotificationDropdown'
import { useNotification } from '@/contexts/NotificationContext'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useFocusManagement } from '@/hooks/useFocusManagement'

interface HeaderProps {
  onMenuClick: () => void
  onSidebarToggle?: () => void
  sidebarCollapsed?: boolean
}

export function Header({ onMenuClick, onSidebarToggle, sidebarCollapsed }: HeaderProps) {
  const { user, logout } = useAuth()
  const { isAdmin } = useIsAdmin()
  const { theme, setTheme } = useTheme()
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  const [showUserMenu, setShowUserMenu] = React.useState(false)
  const [showNotifications, setShowNotifications] = React.useState(false)
  const { unreadCount } = useNotification()
  const { saveFocus: saveUserMenuFocus, restoreFocus: restoreUserMenuFocus } = useFocusManagement()
  const { saveFocus: saveNotificationsFocus, restoreFocus: restoreNotificationsFocus } = useFocusManagement()
  const userMenuRef = useFocusTrap<HTMLDivElement>(showUserMenu)
  const userMenuId = React.useId()
  const notificationsId = React.useId()

  React.useEffect(() => {
    if (showUserMenu) {
      saveUserMenuFocus()
      const menuItems = userMenuRef.current?.querySelectorAll<HTMLElement>('[data-menuitem]')
      menuItems?.[0]?.focus()
      return
    }
    restoreUserMenuFocus()
  }, [restoreUserMenuFocus, saveUserMenuFocus, showUserMenu, userMenuRef])

  React.useEffect(() => {
    if (showNotifications) {
      saveNotificationsFocus()
      return
    }
    restoreNotificationsFocus()
  }, [restoreNotificationsFocus, saveNotificationsFocus, showNotifications])

  const handleUserMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const menuItems = userMenuRef.current?.querySelectorAll<HTMLElement>('[data-menuitem]')
    if (!menuItems || menuItems.length === 0) return

    const items = Array.from(menuItems)
    const currentIndex = items.indexOf(document.activeElement as HTMLElement)

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % items.length
      items[nextIndex]?.focus()
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const nextIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1
      items[nextIndex]?.focus()
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      items[0]?.focus()
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      items[items.length - 1]?.focus()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setShowUserMenu(false)
    }
  }

  return (
    <header
      role="banner"
      className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-900 border-b-0 transition-colors after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-virtualis-gold-500/50 after:to-transparent"
    >
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Menu Buttons */}
        <div className="flex items-center gap-2">
          {/* Menu Button (Mobile) */}
          <button
            onClick={onMenuClick}
            aria-label="Alternar menu"
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Sidebar Toggle Button (Desktop) */}
          {onSidebarToggle && (
            <button
              onClick={onSidebarToggle}
              aria-label="Alternar sidebar"
              className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={sidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>
          )}
        </div>

        {/* Boas vindas */}
        <div className="hidden lg:block">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {user ? `Bem-vindo, ${user.name}` : 'Materia Virtualis'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Alternar tema"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
          >
            {theme === 'light' ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label={unreadCount > 0 ? `Notificações: ${unreadCount} não lidas` : 'Notificações'}
              aria-expanded={showNotifications}
              aria-haspopup="true"
              aria-controls={notificationsId}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
              title="Notificações"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span
                  aria-label={`${unreadCount} notificações não lidas`}
                  className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse"
                ></span>
              )}
            </button>
            <NotificationDropdown 
              id={notificationsId}
              isOpen={showNotifications} 
              onClose={() => setShowNotifications(false)} 
            />
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-label={showUserMenu ? 'Fechar menu do usuário' : 'Abrir menu do usuário'}
              aria-expanded={showUserMenu}
              aria-haspopup="true"
              aria-controls={userMenuId}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-virtualis-blue-600 flex items-center justify-center text-white font-semibold overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  user?.name?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <ChevronDown className="h-4 w-4 hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div
                  id={userMenuId}
                  ref={userMenuRef}
                  role="menu"
                  tabIndex={-1}
                  onKeyDown={handleUserMenuKeyDown}
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                >
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {user?.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user?.email}
                    </p>
                  </div>
                  <div className="py-2">
                    <Link
                      href="/perfil"
                      role="menuitem"
                      data-menuitem
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200"
                    >
                      <User className="h-4 w-4" />
                      Meu Perfil
                    </Link>
                    <Link
                      href="/configuracoes"
                      role="menuitem"
                      data-menuitem
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200"
                    >
                      <Settings className="h-4 w-4" />
                      Configurações
                    </Link>
                  </div>
                  {isAdmin && (
                    <div className="py-2 border-t border-gray-200 dark:border-gray-700">
                      <Link
                        href="/admin"
                        role="menuitem"
                        data-menuitem
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-virtualis-blue-600 dark:text-virtualis-blue-400 font-medium"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Shield className="h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </div>
                  )}
                  <div className="py-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={logout}
                      role="menuitem"
                      data-menuitem
                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
