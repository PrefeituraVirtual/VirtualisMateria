import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Database,
  Cloud,
  Cpu,
  HardDrive,
  Globe,
  Server,
} from 'lucide-react'
import {
  AdminLayout,
  HealthGrid,
  HealthService,
  ServiceStatus,
} from '@/components/admin'
import { adminService } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import toast from 'react-hot-toast'

/**
 * Health History Entry
 * Backend returns services as an object with service names as keys
 */
interface HealthHistoryEntry {
  id?: string
  timestamp?: string
  createdAt?: string
  status?: string
  services: Record<string, {
    healthy: boolean
    responseTimeMs?: number
    error?: string
    details?: Record<string, unknown>
  }>
}

/**
 * System Health Monitor Page
 * Displays real-time status of all system services
 */
// Service icon mapping
const serviceIcons: Record<string, typeof Database> = {
  deepseek: Cloud,
  postgresql: Database,
  postgres: Database,
  redis: HardDrive,
  openai: Globe,
  api: Server,
  backend: Cpu,
}

export default function HealthMonitorPage() {
  // State
  const [services, setServices] = useState<HealthService[]>([])
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<HealthHistoryEntry[]>([])
  const [autoRefresh, _setAutoRefresh] = useState(true)

  // Ref for auto-refresh interval
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load health status
  const loadHealthStatus = useCallback(async () => {
    try {
      const response = await adminService.getHealthStatus()
      // api.get returns response.data directly, so response IS the data

      if (response?.success) {
        // Map API response to component format
        // Backend returns services as object: { postgres: {...}, deepseek: {...} }
        // We need to convert to array for the component
        const servicesObj = (response.data.services as Record<string, unknown>) || {}
        const servicesArray = Object.entries(servicesObj).map(([name, data]) => {
          if (typeof data === 'boolean') {
            return { name, healthy: data }
          }
          return { name, ...(data as Record<string, unknown>) }
        })

        const mappedServices: HealthService[] = servicesArray.map((service: any) => {
          const serviceName = service.name?.toLowerCase() || ''
          const icon =
            serviceIcons[serviceName] ||
            serviceIcons[serviceName.split('_')[0]] ||
            Server

          return {
            id: service.id || service.name,
            name: service.name || service.id,
            description: service.description,
            status: mapStatus(service.healthy ? 'healthy' : service.status || 'unknown'),
            responseTime: service.responseTime || service.response_time || service.responseTimeMs,
            lastCheck: service.lastCheck || service.last_check || new Date().toISOString(),
            icon,
            errorMessage: service.error || service.errorMessage,
          }
        })

        setServices(mappedServices)
        const responseMeta = response as { timestamp?: string }
        setLastUpdate(responseMeta.timestamp || new Date().toISOString())
      }
    } catch (error) {
      console.error('Error loading health status:', error)
      // Don't show error toast on every refresh, only on initial load
      if (loading) {
        toast.error('Erro ao carregar status do sistema')
      }
      // Set default services if API fails
      setServices(getDefaultServices())
    } finally {
      setLoading(false)
    }
  }, [loading])

  // Load health history
  const loadHealthHistory = useCallback(async () => {
    try {
      const response = await adminService.getHealthHistory(24) // Last 24 entries
      // api.get returns response.data directly
      const responseData = response as { snapshots?: HealthHistoryEntry[] }
      const historyData = responseData.snapshots || (Array.isArray(response) ? response as HealthHistoryEntry[] : [])
      setHistory(historyData)
    } catch (error) {
      console.error('Error loading health history:', error)
    }
  }, [])

  // Map API status to component status
  const mapStatus = (status: string): ServiceStatus => {
    const statusLower = (status || '').toLowerCase()
    if (statusLower === 'healthy' || statusLower === 'ok' || statusLower === 'up') {
      return 'healthy'
    }
    if (statusLower === 'degraded' || statusLower === 'slow' || statusLower === 'warning') {
      return 'degraded'
    }
    if (statusLower === 'down' || statusLower === 'error' || statusLower === 'unhealthy') {
      return 'down'
    }
    return 'unknown'
  }

  // Default services when API fails
  const getDefaultServices = (): HealthService[] => [
    {
      id: 'deepseek',
      name: 'DeepSeek API',
      description: 'Servico de IA principal',
      status: 'unknown',
      icon: Cloud,
    },
    {
      id: 'postgresql',
      name: 'PostgreSQL',
      description: 'Banco de dados principal',
      status: 'unknown',
      icon: Database,
    },
    {
      id: 'redis',
      name: 'Redis',
      description: 'Cache e sessoes',
      status: 'unknown',
      icon: HardDrive,
    },
  ]

  // Handle manual refresh
  const handleRefresh = async () => {
    setLoading(true)
    await loadHealthStatus()
    await loadHealthHistory()
  }

  // Initial load
  useEffect(() => {
    loadHealthStatus()
    loadHealthHistory()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        loadHealthStatus()
      }, 30000) // 30 seconds
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [autoRefresh, loadHealthStatus])

  // Calculate uptime from history
  const calculateUptime = () => {
    if (history.length === 0) return null

    const totalChecks = history.length
    const healthyChecks = history.filter((entry) => {
      // Services is an object with service names as keys
      const servicesObj = entry.services || {}
      const serviceValues = Object.values(servicesObj)
      // Check if all services are healthy
      return serviceValues.length > 0 && serviceValues.every((s) => s.healthy === true)
    }).length

    return ((healthyChecks / totalChecks) * 100).toFixed(2)
  }

  // Calculate average response time
  const calculateAvgResponseTime = () => {
    const responseTimes = services
      .filter((s) => s.responseTime !== undefined)
      .map((s) => s.responseTime as number)

    if (responseTimes.length === 0) return null

    const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    return Math.round(avg)
  }

  const uptime = calculateUptime()
  const avgResponseTime = calculateAvgResponseTime()

  return (
    <AdminLayout
      title="Saude do Sistema"
      description="Monitoramento em tempo real dos servicos"
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Servicos Monitorados
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {services.length}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Server className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Uptime (24h)
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {uptime ? `${uptime}%` : '--'}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Cpu className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Tempo Medio de Resposta
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {avgResponseTime ? `${avgResponseTime}ms` : '--'}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Globe className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Health Grid */}
        <HealthGrid
          services={services}
          lastUpdate={lastUpdate}
          onRefresh={handleRefresh}
          autoRefreshInterval={autoRefresh ? 30 : 0}
          loading={loading}
        />

        {/* History Section */}
        {history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historico de Status (Ultimas 24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="flex gap-1 min-w-[600px]">
                  {history.slice(0, 48).map((entry, index) => {
                    // Services is an object with service names as keys
                    const servicesObj = entry.services || {}
                    const serviceValues = Object.values(servicesObj)
                    const allHealthy = serviceValues.length > 0 &&
                      serviceValues.every((s) => s.healthy === true)
                    const anyDown = serviceValues.some(
                      (s) => s.healthy === false
                    )
                    const entryTime = entry.timestamp || entry.createdAt || ''

                    return (
                      <div
                        key={entry.id || index}
                        className={`flex-1 h-8 rounded-sm ${
                          allHealthy
                            ? 'bg-green-500'
                            : anyDown
                            ? 'bg-red-500'
                            : 'bg-amber-500'
                        }`}
                        title={`${entryTime ? new Date(entryTime).toLocaleString('pt-BR') : 'N/A'}: ${
                          allHealthy
                            ? 'Todos operacionais'
                            : anyDown
                            ? 'Servico indisponivel'
                            : 'Performance degradada'
                        }`}
                      />
                    )
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>24h atras</span>
                  <span>Agora</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  )
}
