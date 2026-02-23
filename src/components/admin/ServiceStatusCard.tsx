import React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon, CheckCircle, AlertTriangle, XCircle, Clock, RefreshCw } from 'lucide-react'

export type ServiceStatus = 'healthy' | 'degraded' | 'down' | 'unknown'

export interface ServiceStatusCardProps {
  /** Service name */
  name: string
  /** Service description */
  description?: string
  /** Current status */
  status: ServiceStatus
  /** Response time in milliseconds */
  responseTime?: number
  /** Last check timestamp */
  lastCheck?: string
  /** Icon component */
  icon?: LucideIcon
  /** Error message if status is down */
  errorMessage?: string
  /** Loading state (checking status) */
  loading?: boolean
  /** Additional className */
  className?: string
}

/**
 * ServiceStatusCard Component
 * Displays the status of a single service with status indicator,
 * response time, and last check timestamp
 */
export function ServiceStatusCard({
  name,
  description,
  status,
  responseTime,
  lastCheck,
  icon: Icon,
  errorMessage,
  loading = false,
  className,
}: ServiceStatusCardProps) {
  // Status configuration
  const statusConfig: Record<
    ServiceStatus,
    {
      label: string
      color: string
      bgColor: string
      borderColor: string
      icon: typeof CheckCircle
    }
  > = {
    healthy: {
      label: 'Operacional',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      borderColor: 'border-green-200 dark:border-green-800',
      icon: CheckCircle,
    },
    degraded: {
      label: 'Degradado',
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      borderColor: 'border-amber-200 dark:border-amber-800',
      icon: AlertTriangle,
    },
    down: {
      label: 'Indisponivel',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      borderColor: 'border-red-200 dark:border-red-800',
      icon: XCircle,
    },
    unknown: {
      label: 'Desconhecido',
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-100 dark:bg-gray-800',
      borderColor: 'border-gray-200 dark:border-gray-700',
      icon: AlertTriangle,
    },
  }

  const config = statusConfig[status]
  const StatusIcon = config.icon

  // Format response time
  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  // Format last check time
  const formatLastCheck = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)

    if (diffSecs < 60) return 'Agora mesmo'
    if (diffMins < 60) return `Ha ${diffMins} min`
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get response time color
  const getResponseTimeColor = (ms: number) => {
    if (ms < 200) return 'text-green-600 dark:text-green-400'
    if (ms < 500) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  if (loading) {
    return (
      <div
        className={cn(
          'p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900',
          className
        )}
      >
        <div className="animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              <div>
                <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'p-6 rounded-xl border bg-white dark:bg-gray-900 transition-all hover:shadow-md',
        config.borderColor,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn('p-3 rounded-lg', config.bgColor)}>
              <Icon className={cn('h-6 w-6', config.color)} />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {name}
            </h3>
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Loading indicator for refresh */}
        {loading && (
          <RefreshCw className="h-5 w-5 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Status and Metrics */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Status Badge */}
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full',
            config.bgColor
          )}
        >
          <StatusIcon className={cn('h-4 w-4', config.color)} />
          <span className={cn('text-sm font-medium', config.color)}>
            {config.label}
          </span>
        </div>

        {/* Response Time */}
        {responseTime !== undefined && status !== 'down' && (
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className={getResponseTimeColor(responseTime)}>
              {formatResponseTime(responseTime)}
            </span>
          </div>
        )}

        {/* Last Check */}
        {lastCheck && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Verificado: {formatLastCheck(lastCheck)}
          </div>
        )}
      </div>

      {/* Error Message */}
      {status === 'down' && errorMessage && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">
            {errorMessage}
          </p>
        </div>
      )}
    </div>
  )
}
