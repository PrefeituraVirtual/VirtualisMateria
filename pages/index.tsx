import React, { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { SEOHead } from '@/components/common/SEOHead'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  Plus, MessageCircle, ChevronLeft, ChevronRight, Calendar, HelpCircle, ArrowRight,
  FileText, Clock, CheckCircle2, Folder, BookOpen
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Icon map for dynamic icon lookup (stats, quick actions, activities)
const iconMap: Record<string, LucideIcon> = {
  FileText, Clock, CheckCircle2, Folder, MessageCircle, BookOpen
}
import { QUICK_ACTIONS } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import { useDashboard } from '@/hooks/useDashboard'
import { formatDate } from '@/lib/utils'
import { agendaService } from '@/lib/api'
import { useState } from 'react'

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)

  const formatDisplayName = (name?: string) => {
    // ... existing code ...
    if (!name) return ''
    const base = name.includes('@') ? name.split('@')[0] : name
    return base
      .split(/[\s._-]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }
  const { stats: dashboardStats, activities: dashboardActivities, loading: dashboardLoading, pagination, changePage } = useDashboard()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
        setLoadingEvents(true)
        agendaService.getAll()
           .then(response => {
               if (!response.success) return

               // Filter upcoming (including today) and sort by date
               const now = new Date()
               now.setHours(0, 0, 0, 0) // Reset to start of day to include today's events

               const upcoming = response.data
                    .filter((event) => event.data || event.date)  // Filter out events without a date
                    .map((event) => {
                        const eventDate = new Date(event.data || event.date || '')
                        const description = event.descricao || event.description || ''
                        const timeMatch = description.match(/Horario:\s*([^|]+)/)
                        const timeValue = timeMatch?.[1]?.trim()

                        if (timeValue) {
                            const [hours, minutes] = timeValue.split(':').map(Number)
                            eventDate.setHours(hours, minutes)
                        }
                        return {
                          ...event,
                          title: event.titulo || event.title || '',
                          time: timeValue,
                          fullDate: eventDate
                        }
                    })
                    .filter((e) => e.fullDate >= now)
                    .sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime())
                    .slice(0, 3)
               setUpcomingEvents(upcoming)
           })
           .catch(console.error)
           .finally(() => setLoadingEvents(false))
    }
  }, [user])

  // Mostrar loading enquanto verifica autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  // Se não está autenticado, não renderizar nada (redirecionamento em andamento)
  if (!user) {
    return null
  }

  // Map dashboard data to stats format for rendering
  const stats = [
    {
      title: 'Matérias Criadas',
      value: dashboardLoading ? '...' : (dashboardStats?.materiasCriadas?.toString() || '0'),
      change: 'Total registrado',
      icon: 'FileText',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Em Tramitação',
      value: dashboardLoading ? '...' : (dashboardStats?.emTramitacao?.toString() || '0'),
      change: 'Em análise',
      icon: 'Clock',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
    {
      title: 'Aprovadas',
      value: dashboardLoading ? '...' : (dashboardStats?.aprovadas?.toString() || '0'),
      change: 'Status aprovado',
      icon: 'CheckCircle2',
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: 'Documentos Salvos',
      value: dashboardLoading ? '...' : (dashboardStats?.documentosSalvos?.toString() || '0'),
      change: 'Biblioteca pessoal',
      icon: 'Folder',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
  ]

  const recentActivities = dashboardActivities || []

  const _getIcon = (iconName: string) => {
    const Icon = iconMap[iconName]
    return Icon ? <Icon className="h-5 w-5" /> : null
  }

  return (
    <>
      <SEOHead
        title="Dashboard - Sistema Legislativo com IA"
        description="Gerencie matérias legislativas, converse com IA e acompanhe tramitações no Materia Virtualis"
        canonical="/"
      />

      <MainLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-virtualis-blue-800 via-virtualis-blue-700 to-virtualis-blue-600 rounded-lg p-6 text-white">
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">
              {user ? `Bem-vindo de volta, ${formatDisplayName(user.name)}!` : 'Bem-vindo ao Materia Virtualis!'} 👋
            </h1>
            <p className="text-blue-100 mb-4">
              Hoje é {formatDate(new Date())}. {user ? 'Veja o resumo das suas atividades legislativas.' : 'Sistema de assistência legislativa com IA.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/materias/criar">
                <Button variant="secondary" size="md">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Matéria
                </Button>
              </Link>
              <Link href="/chatbot">
                <Button variant="outline" size="md" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Conversar com IA
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = iconMap[stat.icon] || FileText
              return (
                <Card key={stat.title} hover className="glass glass-dark hover:border-virtualis-gold-500/30 transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {stat.title}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                          {stat.value}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {stat.change}
                        </p>
                      </div>
                      <div className={`p-3 rounded-lg ${stat.bgColor} border border-white/10`}>
                        <Icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Ações Rápidas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {QUICK_ACTIONS.map((action) => {
                const Icon = iconMap[action.icon] || FileText
                return (
                  <Link key={action.title} href={action.href}>
                    <Card hover className="h-full cursor-pointer group glass glass-dark hover:border-virtualis-gold-500/30 transition-all duration-300">
                      <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center">
                          <div className="p-4 rounded-lg bg-blue-100 dark:bg-blue-900/30 group-hover:scale-110 transition-transform border border-white/10 group-hover:border-virtualis-gold-500/20">
                            <Icon className="h-8 w-8 text-blue-600 group-hover:text-virtualis-gold-600 dark:group-hover:text-virtualis-gold-400 transition-colors" />
                          </div>
                          <h3 className="mt-4 font-semibold text-gray-900 dark:text-gray-100">
                            {action.title}
                          </h3>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {action.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="glass glass-dark border-0">
                <CardHeader>
                  <CardTitle>Atividades Recentes</CardTitle>
                  <CardDescription>
                    Suas últimas ações no sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardLoading ? (
                      <div className="text-center py-8">
                        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-sm text-gray-500">Carregando atividades...</p>
                      </div>
                    ) : recentActivities.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500">Nenhuma atividade recente</p>
                      </div>
                    ) : (
                      <>
                        {recentActivities.map((activity) => {
                          const Icon = iconMap[activity.icon || 'FileText'] || FileText
                          return (
                            <div
                              key={activity.id}
                              className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                              <div className="p-2 bg-virtualis-blue-100 dark:bg-virtualis-blue-900/30 rounded-lg">
                                <Icon className="h-5 w-5 text-virtualis-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  {activity.title}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {activity.description}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  {formatDate(new Date(activity.date))}
                                </p>
                              </div>
                            </div>
                          )
                        })}

                        {/* Pagination Controls */}
                        {pagination && pagination.totalPages > 1 && (
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => changePage(pagination.page - 1)}
                              disabled={pagination.page <= 1}
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Anterior
                            </Button>
                            
                            <span className="text-sm text-gray-500">
                              Página {pagination.page} de {pagination.totalPages}
                            </span>

                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => changePage(pagination.page + 1)}
                              disabled={pagination.page >= pagination.totalPages}
                            >
                              Próximo
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Link href="/documentos">
                      <Button variant="ghost" size="sm" className="w-full">
                        Ver todas as atividades
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Agenda */}
              <Card className="glass glass-dark border-0">
                <CardHeader>
                  <CardTitle>Próximas Atividades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {loadingEvents ? (
                       <p className="text-sm text-gray-500 text-center py-4">Carregando...</p>
                    ) : upcomingEvents.length === 0 ? (
                       <p className="text-sm text-gray-500 text-center py-4">Nenhuma atividade próxima.</p>
                    ) : (
                        upcomingEvents.map((event: any) => (
                            <div key={event.id} className="flex items-start gap-3">
                                <div className={`p-2 rounded ${
                                    event.urgency === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                                    event.urgency === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' :
                                    'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                                }`}>
                                    <Calendar className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium line-clamp-1">{event.title}</p>
                                    <p className="text-xs text-gray-500">
                                        {formatDate(event.fullDate)} {event.time ? `às ${event.time}` : ''}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                  </div>
                  <div className="mt-4">
                    <Link href="/agenda">
                      <Button variant="ghost" size="sm" className="w-full">
                        Ver agenda completa
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Ajuda */}
              <Card className="bg-gradient-to-br from-virtualis-blue-50 to-virtualis-cyan-50 dark:from-virtualis-blue-900/20 dark:to-virtualis-cyan-900/20 border-virtualis-blue-200 dark:border-virtualis-blue-800">
                <CardContent className="pt-6">
                  <HelpCircle className="h-8 w-8 text-virtualis-blue-600 mb-3" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Precisa de ajuda?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Converse com nosso assistente de IA para tirar dúvidas sobre processos legislativos.
                  </p>
                  <Link href="/chatbot">
                    <Button variant="primary" size="sm" className="w-full">
                      Iniciar conversa
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </MainLayout>
    </>
  )
}
