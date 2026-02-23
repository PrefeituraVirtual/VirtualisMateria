import React from 'react'
import { cn } from '@/lib/utils'
import { ServiceStatusCard, ServiceStatusCardProps, ServiceStatus } from './ServiceStatusCard'
import { RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface HealthService extends Omit<ServiceStatusCardProps, 'loading' | 'className'> {
  /** Unique service ID */
  id: string
}

export interface HealthGridProps {
  /** Array of services to display */
  services: HealthService[]
  /** Last update timestamp */
  lastUpdate?: string
  /** Callback to refresh health status */
  onRefresh?: () => void
  /** Auto-refresh interval in seconds */
  autoRefreshInterval?: number
  /** Loading state */
  loading?: boolean
  /** Additional className */
  className?: string
}

/**
 * HealthGrid Component
 * Grid layout for displaying multiple service status cards
 * with overall health summary and refresh controls
 */
export function HealthGrid({
  services,
  lastUpdate,
  onRefresh,
  autoRefreshInterval = 30,
  loading = false,
  className,
}: HealthGridProps) {
  // Calculate overall health
  const healthySevices = services.filter((s) => s.status === 'healthy').length
  const degradedServices = services.filter((s) => s.status === 'degraded').length
  const downServices = services.filter((s) => s.status === 'down').length

  const overallStatus: ServiceStatus =
    downServices > 0 ? 'down' : degradedServices > 0 ? 'degraded' : 'healthy'

  const statusMessages: Record<ServiceStatus, string> = {
    healthy: 'Todos os servicos estao operacionais',
    degraded: `${degradedServices} servico(s) com performance degradada`,
    down: `${downServices} servico(s) indisponivel(is)`,
    unknown: 'Status desconhecido',
  }

  // Format last update time
  const formatLastUpdate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Health Summary */}
      <div
        className={cn(
          'p-4 rounded-xl border',
          overallStatus === 'healthy'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : overallStatus === 'degraded'
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {overallStatus === 'healthy' ? (
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle
                className={cn(
                  'h-6 w-6',
                  overallStatus === 'degraded'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-red-600 dark:text-red-400'
                )}
              />
            )}
            <div>
              <p
                className={cn(
                  'font-medium',
                  overallStatus === 'healthy'
                    ? 'text-green-700 dark:text-green-300'
                    : overallStatus === 'degraded'
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-red-700 dark:text-red-300'
                )}
              >
                {statusMessages[overallStatus]}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {healthySevices}/{services.length} servicos operacionais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Last Update */}
            {lastUpdate && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Atualizado: {formatLastUpdate(lastUpdate)}
              </p>
            )}

            {/* Refresh Button */}
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw
                  className={cn('h-4 w-4', loading && 'animate-spin')}
                />
                Atualizar
              </Button>
            )}
          </div>
        </div>

        {/* Auto-refresh indicator */}
        {autoRefreshInterval > 0 && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Atualizacao automatica a cada {autoRefreshInterval} segundos
          </p>
        )}
      </div>

      {/* Services Grid */}
      {loading && services.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <ServiceStatusCard
              key={i}
              name=""
              status="unknown"
              loading={true}
            />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="p-12 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Nenhum servico configurado
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure os servicos de monitoramento no backend
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <ServiceStatusCard
              key={service.id}
              {...service}
              loading={loading}
            />
          ))}
        </div>
      )}
    </div>
  )
}
