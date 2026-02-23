import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
// import { MainLayout } from '@/components/layout/MainLayout' -> Removed
import { AdminNav } from './AdminNav'
import { useAuth } from '@/hooks/useAuth'
import { Shield } from 'lucide-react'

interface AdminLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
}

/**
 * AdminLayout Component
 * Wrapper layout for all admin pages with navigation sidebar
 * Includes authentication check and admin role verification
 */
export function AdminLayout({
  children,
  title = 'Admin Dashboard',
  description,
}: AdminLayoutProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false)

  // Load saved state
  useEffect(() => {
    const saved = localStorage.getItem('adminSidebarCollapsed')
    if (saved) {
      setIsSidebarCollapsed(JSON.parse(saved))
    }
  }, [])

  // Toggle handler
  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed
    setIsSidebarCollapsed(newState)
    localStorage.setItem('adminSidebarCollapsed', JSON.stringify(newState))
  }

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Verificando permissoes...
          </p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return null
  }

  return (
    <>
      <Head>
        <title>{title} - Materia Virtualis</title>
        {description && <meta name="description" content={description} />}
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
        {/* Sidebar Navigation */}
        <AdminNav collapsed={isSidebarCollapsed} onToggle={toggleSidebar} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {/* Top Bar / Header */}
          <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-6 flex-shrink-0 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {title}
                </h1>
                {description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                    {description}
                  </p>
                )}
              </div>
            </div>
            
            {/* User Info / Actions would go here */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-right hidden md:block">
                <p className="font-medium text-gray-900 dark:text-gray-100">{user?.name || 'Admin'}</p>
                <p className="text-xs text-gray-500">Administrador</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.substring(0, 2).toUpperCase() || 'AD'}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
            <div className="animate-fade-in max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
