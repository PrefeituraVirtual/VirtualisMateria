import React from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { AlertLevel } from './types'

/**
 * Props for IntelligenceStatsCard component
 */
export interface IntelligenceStatsCardProps {
  /** Card title */
  title: string
  /** Main value to display */
  value: string | number
  /** Percentage change from previous period */
  change?: number
  /** Label for the change period */
  changeLabel?: string
  /** Icon component */
  icon?: React.ReactNode
  /** Alert level for visual indication */
  alert?: AlertLevel
  /** Loading state */
  loading?: boolean
  /** Additional className */
  className?: string
  /** Optional subtitle or description */
  subtitle?: string
  /** Optional suffix for the value (e.g., '%', 'k') */
  valueSuffix?: string
}

/**
 * Alert level styling configuration
 */
const alertStyles: Record<AlertLevel, { bg: string; border: string; icon: string; badge: string }> = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  danger: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
}

/**
 * Default styling when no alert level is provided
 */
const defaultStyles = {
  bg: 'bg-white dark:bg-gray-900',
  border: 'border-gray-200 dark:border-gray-800',
  icon: 'text-gray-600 dark:text-gray-400',
  badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

/**
 * Format number with locale
 */
const formatValue = (value: string | number): string => {
  if (typeof value === 'number') {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`
    }
    return value.toLocaleString('pt-BR')
  }
  return value
}

/**
 * IntelligenceStatsCard Component
 * Displays a single intelligence metric with value, trend indicator, and alert status
 */
export function IntelligenceStatsCard({
  title,
  value,
  change,
  changeLabel = 'vs. periodo anterior',
  icon,
  alert,
  loading = false,
  className,
  subtitle,
  valueSuffix,
}: IntelligenceStatsCardProps) {
  const styles = alert ? alertStyles[alert] : defaultStyles

  /**
   * Render trend indicator based on change value
   */
  const renderTrendIndicator = () => {
    if (change === undefined || change === null) return null

    const isPositive = change > 0
    const isNeutral = Math.abs(change) < 0.1
    const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown

    // Determine trend color - for confusion rate, decrease is good
    const trendColorClass = isNeutral
      ? 'text-gray-500 dark:text-gray-400'
      : isPositive
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400'

    return (
      <div className={cn('flex items-center gap-1 text-sm font-medium', trendColorClass)}>
        <TrendIcon className="h-4 w-4" />
        <span>
          {isPositive ? '+' : ''}
          {change.toFixed(1)}%
        </span>
      </div>
    )
  }

  /**
   * Render loading skeleton
   */
  if (loading) {
    return (
      <div
        className={cn(
          'p-6 rounded-xl border transition-all',
          defaultStyles.bg,
          defaultStyles.border,
          className
        )}
      >
        <div className="animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="h-9 w-28 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'p-6 rounded-xl border transition-all hover:shadow-md',
        styles.bg,
        styles.border,
        className
      )}
    >
      {/* Header with icon and trend */}
      <div className="flex items-start justify-between mb-4">
        {icon && (
          <div className={cn('p-3 rounded-lg', styles.badge)}>
            <div className={cn('h-6 w-6', styles.icon)}>{icon}</div>
          </div>
        )}
        {renderTrendIndicator()}
      </div>

      {/* Value */}
      <div className="space-y-1">
        <div className="flex items-baseline gap-1">
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {formatValue(value)}
          </p>
          {valueSuffix && (
            <span className="text-xl font-semibold text-gray-500 dark:text-gray-400">
              {valueSuffix}
            </span>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</p>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}

        {/* Change label */}
        {change !== undefined && change !== null && changeLabel && (
          <p className="text-xs text-gray-400 dark:text-gray-500">{changeLabel}</p>
        )}

        {/* Alert badge */}
        {alert && (
          <div className="pt-2">
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                styles.badge
              )}
            >
              {alert === 'success' && 'Normal'}
              {alert === 'warning' && 'Atencao'}
              {alert === 'danger' && 'Critico'}
              {alert === 'info' && 'Info'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
