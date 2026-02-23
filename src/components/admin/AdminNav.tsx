import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  MessageSquare,
  Activity,
  ChevronLeft,
  Brain,
  Database,
} from 'lucide-react'

/**
 * Navigation items for the admin dashboard
 */
const navItems = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Visao geral e estatisticas',
  },
  {
    href: '/admin/conversations',
    label: 'Conversas',
    icon: MessageSquare,
    description: 'Auditoria de conversas IA',
  },
  {
    href: '/admin/intelligence',
    label: 'Intelligence',
    icon: Brain,
    description: 'Analise de inteligencia',
  },
  {
    href: '/admin/data-analyst',
    label: 'Data Analyst',
    icon: Database,
    description: 'Consultas em linguagem natural',
  },
  {
    href: '/admin/health',
    label: 'Saude do Sistema',
    icon: Activity,
    description: 'Monitoramento de servicos',
  },
]

/**
 * AdminNav Component
 * Navigation sidebar for admin pages with active state indication
 */
interface AdminNavProps {
  collapsed: boolean
  onToggle: () => void
}

export function AdminNav({ collapsed, onToggle }: AdminNavProps) {
  const router = useRouter()

  return (
    <nav 
      className={cn(
        "h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-4 flex flex-col flex-shrink-0 z-20 shadow-sm relative transition-all duration-300 ease-in-out",
        collapsed ? "w-20 items-center" : "w-64"
      )}
    >
      {/* Back to main app */}
      <Link
        href="/painel"
        className={cn(
          "flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 group transition-all",
          collapsed ? "justify-center" : ""
        )}
        title="Voltar ao Painel"
      >
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        {!collapsed && <span>Voltar ao Painel</span>}
      </Link>

      {/* Admin title */}
      <div className={cn("mb-6 transition-all", collapsed ? "text-center" : "")}>
        {!collapsed ? (
          <>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
              Admin Dashboard
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              Gerenciamento do sistema
            </p>
          </>
        ) : (
           <h2 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest">
              Admin
            </h2>
        )}
      </div>

      {/* Navigation items */}
      <div className="space-y-1 w-full">
        {navItems.map((item) => {
          const isActive =
            router.pathname === item.href ||
            (item.href !== '/admin' && router.pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                isActive
                  ? 'bg-gradient-to-r from-virtualis-gold-500/10 to-transparent text-virtualis-blue-600 dark:text-virtualis-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-virtualis-blue-600 dark:hover:text-virtualis-blue-400',
                isActive && !collapsed ? 'border-l-2 border-virtualis-gold-500' : '',
                collapsed ? 'justify-center p-3' : ''
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 flex-shrink-0 transition-colors',
                  isActive ? 'text-virtualis-blue-600 dark:text-virtualis-blue-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-virtualis-blue-600 dark:group-hover:text-virtualis-blue-400'
                )}
              />
              {!collapsed && (
                <div className="flex-1 min-w-0 animate-fade-in opacity-100">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                  <p
                    className={cn(
                      'text-xs truncate transition-colors',
                      isActive
                        ? 'text-virtualis-blue-500 dark:text-virtualis-blue-300'
                        : 'text-gray-400 dark:text-gray-500'
                    )}
                  >
                    {item.description}
                  </p>
                </div>
              )}
              
              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </Link>
          )
        })}
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-1 shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-30"
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        <ChevronLeft className={cn("h-3 w-3 text-gray-500 transition-transform duration-300", collapsed ? "rotate-180" : "")} />
      </button>

      {/* Footer Info */}
      <div className={cn("mt-auto pt-4 border-t border-gray-200 dark:border-gray-800 transition-all", collapsed ? "text-center" : "")}>
         {!collapsed ? (
            <div className="text-xs text-gray-400 dark:text-gray-600">
              v1.0.4
            </div>
         ) : (
            <div className="text-[10px] text-gray-400">v1</div>
         )}
      </div>
    </nav>
  )
}
