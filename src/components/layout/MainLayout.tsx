import React, { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAuth } from '@/hooks/useAuth'
import { PageLoading } from '@/components/ui/Loading'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed')
      return saved !== null ? JSON.parse(saved) : false
    }
    return false
  })

  // Call hook at the top level of the component
  const { loading, user } = useAuth()

  // Salvar estado do sidebar no localStorage
  React.useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  if (loading) {
    return <PageLoading />
  }

  // Fallback layout when user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-gray-900 focus:shadow-lg dark:focus:bg-gray-900 dark:focus:text-gray-100"
        >
          Pular para conteúdo principal
        </a>
        <header
          role="banner"
          className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800"
        >
          <div className="flex items-center justify-between h-full px-4 lg:px-6">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Materia Virtualis
            </h1>
            <div className="text-sm text-gray-500">
              Modo de demonstração
            </div>
          </div>
        </header>

        <main id="main-content" role="main" className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-gray-900 focus:shadow-lg dark:focus:bg-gray-900 dark:focus:text-gray-100"
      >
        Pular para conteúdo principal
      </a>
      <div className="print:hidden">
        <Sidebar
          isOpen={sidebarOpen}
          collapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      <div className={`transition-all duration-300 ease-in-out min-h-screen print:pl-0 ${
        sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-72'
      }`}>
        <div className="print:hidden">
          <Header
            onMenuClick={() => setSidebarOpen(true)}
            onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            sidebarCollapsed={sidebarCollapsed}
          />
        </div>

        <main id="main-content" role="main" className="p-4 lg:p-6 animate-fade-in print:p-0">
          {children}
        </main>
      </div>
    </div>
  )
}
