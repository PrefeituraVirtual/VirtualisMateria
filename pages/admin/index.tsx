import React, { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
  MessageSquare,
  Users,
  Zap,
  BarChart3,
} from 'lucide-react'
import {
  AdminLayout,
  StatsGrid,
  TopUsersTable,
  TrendDataPoint,
  TopUser,
} from '@/components/admin'
import { adminService } from '@/lib/api'
import toast from 'react-hot-toast'

// Chart skeleton for loading state
const TrendsChartSkeleton = () => (
  <div className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-800 p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="flex gap-2">
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
    <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded" />
  </div>
)

// Lazy load TrendsChart component (heavy dependency: recharts)
const TrendsChart = dynamic(
  () => import('@/components/admin').then(mod => ({ default: mod.TrendsChart })),
  { loading: () => <TrendsChartSkeleton />, ssr: false }
)

/**
 * Admin Dashboard Stats Interface
 */
interface DashboardStats {
  totalConversations: number
  totalMessages: number
  activeUsers: number
  tokensUsed: number
  conversationsTrend?: number
  messagesTrend?: number
  usersTrend?: number
  tokensTrend?: number
}

/**
 * Admin Dashboard Page
 * Main admin page with stats cards, trends chart, and top users
 */
export default function AdminDashboardPage() {
  // State
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [trends, setTrends] = useState<TrendDataPoint[]>([])
  const [topUsers, setTopUsers] = useState<TopUser[]>([])
  const [trendPeriod, setTrendPeriod] = useState<'7d' | '30d' | '90d'>('7d')
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingTrends, setLoadingTrends] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)

  // Calculate date range from period
  const getDateRangeFromPeriod = (period: '7d' | '30d' | '90d') => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const to = new Date().toISOString()
    return { from, to }
  }

  // Load dashboard stats
  const loadStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const { from, to } = getDateRangeFromPeriod(trendPeriod)
      const response = await adminService.getStats({ from, to })
      if (response?.success) {
        const statsData = response.data as Record<string, any>
        setStats({
          totalConversations: statsData.conversations?.total || statsData.totalConversations || 0,
          totalMessages: statsData.messages?.total || statsData.totalMessages || 0,
          activeUsers: statsData.users?.active || statsData.activeUsers || 0,
          tokensUsed: statsData.tokens?.total || statsData.tokensUsed || 0,
          conversationsTrend: statsData.conversationsTrend,
          messagesTrend: statsData.messagesTrend,
          usersTrend: statsData.usersTrend,
          tokensTrend: statsData.tokensTrend,
        })
      }
    } catch (error) {
      console.error('Error loading stats:', error)
      toast.error('Erro ao carregar estatisticas')
      // Set default values on error
      setStats({
        totalConversations: 0,
        totalMessages: 0,
        activeUsers: 0,
        tokensUsed: 0,
      })
    } finally {
      setLoadingStats(false)
    }
  }, [trendPeriod])

  // Load trends data
  const loadTrends = useCallback(async () => {
    setLoadingTrends(true)
    try {
      const response = await adminService.getTrends(trendPeriod)
      // api.get returns response.data directly
      // Backend returns { period, days, interval, data: [...], totals, averages, trend }
      // We need the 'data' array
      const trendsData = (response as { data?: TrendDataPoint[] })?.data || []
      setTrends(trendsData)
    } catch (error) {
      console.error('Error loading trends:', error)
      // Set empty array on error
      setTrends([])
    } finally {
      setLoadingTrends(false)
    }
  }, [trendPeriod])

  // Load top users
  const loadTopUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const response = await adminService.getUsers()
      // api.get returns response.data directly
      // Users endpoint returns { users: [...], total: N }
      const usersData = (response as { users?: any[] })?.users || (Array.isArray(response) ? response : [])
      // Sort by conversations and take top 5
      const sorted = usersData
        .sort((a: any, b: any) => (b.stats?.conversations || b.conversations || 0) - (a.stats?.conversations || a.conversations || 0))
        .slice(0, 5)
        .map((user: any) => ({
          id: user.userId || user.id,
          name: user.userName || user.name || user.nome || `Usuario #${user.userId || user.id}`,
          email: user.userEmail || user.email,
          avatar: user.avatar,
          conversations: user.stats?.conversations || user.conversations || 0,
          messages: user.stats?.messages || user.messages || 0,
          tokens: user.stats?.tokens || user.tokens,
          lastActive: user.lastActivity || user.lastActive || user.last_active,
        }))
      setTopUsers(sorted)
    } catch (error) {
      console.error('Error loading users:', error)
      setTopUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadStats()
    loadTopUsers()
  }, [loadStats, loadTopUsers])

  // Reload trends when period changes
  useEffect(() => {
    loadTrends()
  }, [loadTrends])

  // Build stats grid data
  const statsData = stats
    ? [
        {
          label: 'Total de Conversas',
          value: stats.totalConversations,
          icon: MessageSquare,
          trend: stats.conversationsTrend,
          color: 'blue' as const,
        },
        {
          label: 'Total de Mensagens',
          value: stats.totalMessages,
          icon: BarChart3,
          trend: stats.messagesTrend,
          color: 'purple' as const,
        },
        {
          label: 'Usuarios Ativos',
          value: stats.activeUsers,
          icon: Users,
          trend: stats.usersTrend,
          color: 'green' as const,
        },
        {
          label: 'Tokens Utilizados',
          value: stats.tokensUsed,
          icon: Zap,
          trend: stats.tokensTrend,
          color: 'amber' as const,
        },
      ]
    : []

  return (
    <AdminLayout
      title="Dashboard"
      description="Visao geral do sistema de IA"
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <StatsGrid stats={statsData} loading={loadingStats} />

        {/* Trends Chart (Full Width) */}
        <TrendsChart
          data={trends}
          period={trendPeriod}
          onPeriodChange={setTrendPeriod}
          loading={loadingTrends}
        />

        {/* Top Users Table */}
        <TopUsersTable users={topUsers} loading={loadingUsers} />
      </div>
    </AdminLayout>
  )
}
