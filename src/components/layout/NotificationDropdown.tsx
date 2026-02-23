import React from 'react'
import { Bell, Trash2, BellOff, CheckCircle2, AlertCircle, AlertTriangle, Info, Clock, X } from 'lucide-react'
import { useNotification } from '@/contexts/NotificationContext'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface NotificationDropdownProps {
  id?: string
  isOpen: boolean
  onClose: () => void
}

export function NotificationDropdown({ id, isOpen, onClose }: NotificationDropdownProps) {
  const { notifications, markAsRead, markAllAsRead, clearNotification, clearAll } = useNotification()
  const dropdownRef = useFocusTrap<HTMLDivElement>(isOpen)

  React.useEffect(() => {
    if (!isOpen) return
    const items = dropdownRef.current?.querySelectorAll<HTMLElement>('[data-dropdown-item]')
    items?.[0]?.focus()
  }, [dropdownRef, isOpen])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = dropdownRef.current?.querySelectorAll<HTMLElement>('[data-dropdown-item]')
    if (!items || items.length === 0) return

    const list = Array.from(items)
    const currentIndex = list.indexOf(document.activeElement as HTMLElement)

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % list.length
      list[nextIndex]?.focus()
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const nextIndex = currentIndex <= 0 ? list.length - 1 : currentIndex - 1
      list[nextIndex]?.focus()
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      list[0]?.focus()
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      list[list.length - 1]?.focus()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        id={id}
        ref={dropdownRef}
        role="menu"
        aria-label="Notificações"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </h3>
          {notifications.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={markAllAsRead}
                role="menuitem"
                data-dropdown-item
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                Marcar todas como lidas
              </button>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <button
                onClick={clearAll}
                role="menuitem"
                data-dropdown-item
                aria-label="Limpar todas as notificações"
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title="Limpar tudo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* List */}
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
              <BellOff className="h-8 w-8 mb-2 opacity-50" />
              <p>Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  role="menuitem"
                  tabIndex={0}
                  data-dropdown-item
                  aria-label={`${notification.title}. ${notification.message}`}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative group ${
                    !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      markAsRead(notification.id)
                    }
                  }}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {notification.type === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      {notification.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                      {notification.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                      {notification.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        !notification.read ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        clearNotification(notification.id)
                      }}
                      data-dropdown-item
                      aria-label="Remover notificação"
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all absolute top-2 right-2"
                      title="Remover"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {!notification.read && (
                    <div className="absolute top-4 right-2 h-2 w-2 bg-blue-500 rounded-full group-hover:opacity-0 transition-opacity" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
