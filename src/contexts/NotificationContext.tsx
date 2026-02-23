import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: Date
  read: boolean
  link?: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotification: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('virtualis_notifications')
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as unknown
          // Restore Date objects
          if (Array.isArray(parsed)) {
            const isRecord = (value: unknown): value is Record<string, unknown> =>
              typeof value === 'object' && value !== null

            const restored: Notification[] = parsed
              .filter(isRecord)
              .map((n) => {
                const timestampValue = n.timestamp
                const timestamp =
                  typeof timestampValue === 'string' ||
                  typeof timestampValue === 'number' ||
                  timestampValue instanceof Date
                    ? new Date(timestampValue)
                    : new Date()

                const typeValue = n.type
                const type =
                  typeValue === 'info' ||
                  typeValue === 'success' ||
                  typeValue === 'warning' ||
                  typeValue === 'error'
                    ? typeValue
                    : 'info'

                return {
                  id: typeof n.id === 'string' ? n.id : `${Date.now()}-${Math.random()}`,
                  title: typeof n.title === 'string' ? n.title : 'Notificacao',
                  message: typeof n.message === 'string' ? n.message : '',
                  type,
                  timestamp,
                  read: Boolean(n.read),
                  link: typeof n.link === 'string' ? n.link : undefined
                }
              })

            setNotifications(restored)
          }
        } catch (e) {
          console.error('Failed to parse notifications', e)
        }
      }
    }
  }, [])

  // Save to localStorage when changed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('virtualis_notifications', JSON.stringify(notifications))
    }
  }, [notifications])

  const unreadCount = notifications.filter(n => !n.read).length

  const addNotification = useCallback((data: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...data,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false
    }
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)) // Limit to 50
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearNotification,
      clearAll
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}
