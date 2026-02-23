import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { authService } from '@/lib/api'
import axios from 'axios'

export interface DashboardStats {
  materiasCriadas: number
  emTramitacao: number
  aprovadas: number
  documentosSalvos: number
}

export interface DashboardActivity {
  id: string
  type: 'materia' | 'chat' | 'document'
  title: string
  description: string
  date: string
  metadata?: string
  icon?: string
}

interface PaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface UseDashboardReturn {
  stats: DashboardStats | null
  activities: DashboardActivity[]
  loading: boolean
  error: string | null
  pagination: PaginationState
  changePage: (page: number) => void
  refetch: () => void
}

export function useDashboard(): UseDashboardReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<DashboardActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0
  })

  // Track current page to trigger refetch
  const [currentPage, setCurrentPage] = useState(1)

  const fetchDashboardData = useCallback(async (): Promise<void> => {
    // Só fazer requisições se usuário estiver autenticado
    if (!authService.isAuthenticated()) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch both stats and activities in parallel
      // activities endpoint now supports pagination
      const [statsResponse, activitiesResponse] = await Promise.all([
        api.get<{ success: boolean; data: DashboardStats }>('/api/dashboard/stats'),
        api.get<{
          success: boolean
          data: DashboardActivity[]
          pagination?: PaginationState
        }>(`/api/dashboard/activities?page=${currentPage}&limit=${pagination.limit}`)
      ])

      if (statsResponse.success) {
        setStats(statsResponse.data)
      }

      if (activitiesResponse.success) {
        // Map backend activity types to frontend icon names
        const mappedActivities: DashboardActivity[] = activitiesResponse.data.map((activity: DashboardActivity) => ({
          ...activity,
          icon: activity.type === 'materia' ? 'FileText' :
                activity.type === 'chat' ? 'MessageCircle' :
                activity.type === 'document' ? 'Download' :
                'FileText'
        }))
        setActivities(mappedActivities)

        // Update pagination from backend response
        if (activitiesResponse.pagination) {
            setPagination(activitiesResponse.pagination)
        }
      }
    } catch (err: unknown) {
      console.error('Error fetching dashboard data:', err)
      if (axios.isAxiosError(err)) {
        const responseData = err.response?.data
        const message =
          typeof responseData === 'object' &&
          responseData !== null &&
          'message' in responseData &&
          typeof (responseData as { message?: unknown }).message === 'string'
            ? (responseData as { message: string }).message
            : 'Failed to load dashboard data'
        setError(message)
      } else {
        setError('Failed to load dashboard data')
      }
    } finally {
      setLoading(false)
    }
  }, [currentPage, pagination.limit])

  const changePage = (newPage: number): void => {
    if (newPage > 0 && newPage <= (pagination.totalPages || 1)) {
        setCurrentPage(newPage)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData]) // Re-fetch when page changes

  return {
    stats,
    activities,
    loading,
    error,
    pagination,
    changePage,
    refetch: fetchDashboardData
  }
}
