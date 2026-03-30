import React, { useState, useCallback, memo, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/common/Logo'
import { X, ChevronDown, LayoutDashboard, Bot, FileText, BookOpen, Gavel, Megaphone, Mic, Hammer, CalendarDays, Settings, FileStack, ClipboardList, Building, BarChart3, MessageCircle, Plus, List, Mic2, Folder, HardHat, Calendar, Clock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SIDEBAR_ITEMS } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'

// Map of icon names to their components for dynamic rendering
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, Bot, FileText, BookOpen, Gavel, Megaphone, Mic, Hammer, CalendarDays, Settings, FileStack, ClipboardList, Building, BarChart3, MessageCircle, Plus, List, Mic2, Folder, HardHat, Calendar, Clock
}

type SidebarItem = (typeof SIDEBAR_ITEMS)[number]
type SidebarItemWithChildren = SidebarItem & { children: { id: string; label: string; icon: string; href: string }[] }
type SidebarChild = { id: string; label: string; icon: string; href: string }

// Critical routes that should be prefetched for faster navigation
const PREFETCH_ROUTES = ['chatbot', 'materias', 'dashboard', 'painel']

interface SidebarProps {
  isOpen: boolean
  collapsed: boolean
  onClose: () => void
  onToggleCollapse: () => void
}

function SidebarComponent({ isOpen, collapsed, onClose, onToggleCollapse: _onToggleCollapse }: SidebarProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const permissions = user?.materia_permissions || [];
  const isFullAccess = permissions.includes('materia_chatbot_user')
    || permissions.includes('admin_materia_virtualis')
    || user?.isAdmin;

  const visibleItems = useMemo(() => SIDEBAR_ITEMS.filter(item => {
    // Regra específica: Ocultar transcrição para vereadores (council_member)
    if (item.id === 'transcricao' && user?.role === 'council_member') {
      return false;
    }

    if (!item.requiredGroup) return true;   // no restriction (atas, transcricao)
    if (isFullAccess) return true;           // full access users see everything
    return false;                            // transcricao-only users don't see restricted items
  }), [isFullAccess, user]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }, [])

  const isActive = useCallback((href: string) => {
    return router.pathname === href || router.pathname.startsWith(href + '/')
  }, [router.pathname])

  const getIcon = useCallback((iconName: string) => {
    const Icon = iconMap[iconName]
    return Icon ? <Icon className="h-5 w-5" /> : null
  }, [])

  const hasChildren = useCallback((item: SidebarItem): item is SidebarItemWithChildren => {
    if (!('children' in item)) return false
    return Array.isArray(item.children) && item.children.length > 0
  }, [])

  const handleNavKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return

    const target = event.target as HTMLElement | null
    if (target?.isContentEditable) return
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

    if (!/^[1-9]$/.test(event.key)) return

    const itemIndex = Number(event.key) - 1
    const targetItem = visibleItems[itemIndex]
    if (!targetItem) return

    event.preventDefault()
    router.push(targetItem.href)
    onClose()
  }, [onClose, router])

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen bg-white dark:bg-gray-900 border-r-0 after:absolute after:top-0 after:right-0 after:h-full after:w-[1px] after:bg-gradient-to-b after:from-transparent after:via-virtualis-gold-500/50 after:to-transparent',
          'transition-all duration-300 ease-in-out',
          'lg:translate-x-0',
          // Mobile behavior
          isOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop behavior
          collapsed ? 'lg:w-16' : 'lg:w-72',
          'w-72' // Mobile sempre usa width completo
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header do Sidebar */}
          <div className="flex items-center justify-between h-16 border-b-0 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-virtualis-gold-500/50 after:to-transparent px-2 lg:px-6">
            {/* Logo */}
            <div className="flex items-center justify-center flex-1">
              {collapsed ? (
                <Logo variant="icon" size="md" />
              ) : (
                <Logo variant="full" size="md" />
              )}
            </div>

            {/* Close para Mobile */}
            <button
              onClick={onClose}
              aria-label="Fechar menu"
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:ring-2 focus-visible:ring-virtualis-blue-500 focus-visible:ring-offset-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navegação */}
          <nav
            role="navigation"
            aria-label="Menu principal"
            className="flex-1 overflow-y-auto px-2 lg:px-4 py-6"
            onKeyDown={handleNavKeyDown}
          >
            <ul role="list" className="space-y-1">
              {visibleItems.map((item) => {
                const itemHasChildren = hasChildren(item)
                const isExpanded = expandedItems.includes(item.id)
                const active = isActive(item.href)
                const submenuId = `sidebar-submenu-${item.id}`

                return (
                  <li key={item.id} role="listitem">
                    <Link
                      href={itemHasChildren ? '#' : item.href}
                      prefetch={PREFETCH_ROUTES.includes(item.id)}
                      onClick={(e) => {
                        if (itemHasChildren) {
                          e.preventDefault()
                          if (!collapsed || isOpen) {
                            toggleExpanded(item.id)
                          }
                        } else {
                          onClose()
                        }
                      }}
                      aria-current={active ? 'page' : undefined}
                      aria-expanded={itemHasChildren ? isExpanded : undefined}
                      aria-controls={itemHasChildren ? submenuId : undefined}
                      className={cn(
                        'flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all duration-300 group relative overflow-hidden focus-visible:ring-2 focus-visible:ring-virtualis-blue-500 focus-visible:ring-offset-2',
                        active
                          ? 'bg-gradient-to-r from-virtualis-gold-500/10 to-transparent text-virtualis-blue-600 dark:text-virtualis-blue-400 border-l-2 border-virtualis-gold-500'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-virtualis-blue-600 dark:hover:text-virtualis-blue-400',
                        collapsed && 'lg:justify-center'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <div className={cn(
                        'flex items-center gap-3',
                        collapsed && 'lg:gap-0'
                      )}>
                        {getIcon(item.icon)}
                        {(!collapsed || isOpen) && (
                          <span>{item.label}</span>
                        )}
                      </div>

                      {(!collapsed || isOpen) && (
                        <div className="flex items-center gap-2">
                          {'badge' in item && item.badge !== undefined && item.badge > 0 && (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-virtualis-cyan-500 text-white">
                              {item.badge}
                            </span>
                          )}
                          {itemHasChildren && (
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 transition-transform',
                                isExpanded && 'transform rotate-180'
                              )}
                            />
                          )}
                        </div>
                      )}
                    </Link>

                    {/* Submenu */}
                    {itemHasChildren && isExpanded && (
                      <ul id={submenuId} role="list" className="ml-4 mt-1 space-y-1">
                        {item.children.map((child: SidebarChild) => (
                          <li key={child.id} role="listitem">
                            <Link
                              href={child.href}
                              prefetch={PREFETCH_ROUTES.includes(item.id)}
                              onClick={onClose}
                              aria-current={isActive(child.href) ? 'page' : undefined}
                              className={cn(
                                'flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors focus-visible:ring-2 focus-visible:ring-virtualis-blue-500 focus-visible:ring-offset-2',
                                isActive(child.href)
                                  ? 'bg-virtualis-blue-50 dark:bg-virtualis-blue-900/20 text-virtualis-blue-600 dark:text-virtualis-blue-400'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                              )}
                            >
                              {getIcon(child.icon)}
                              <span>{child.label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Footer do Sidebar */}
          <div className="p-2 lg:p-4 border-t-0 relative before:absolute before:top-0 before:left-0 before:w-full before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-virtualis-gold-500/50 before:to-transparent">
            {(!collapsed || isOpen) ? (
              <div className="text-xs text-center text-gray-500 dark:text-gray-400">
                Materia Virtualis v1.0
                <br />
                © 2026 - Virtualis
              </div>
            ) : (
              <div className="text-xs text-center text-gray-500 dark:text-gray-400">
                MV
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

// Memoize Sidebar to prevent unnecessary re-renders
// Only re-renders when isOpen, collapsed, onClose, or onToggleCollapse changes
export const Sidebar = memo(SidebarComponent, (prevProps, nextProps) => {
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.collapsed === nextProps.collapsed &&
    prevProps.onClose === nextProps.onClose &&
    prevProps.onToggleCollapse === nextProps.onToggleCollapse
  )
})
