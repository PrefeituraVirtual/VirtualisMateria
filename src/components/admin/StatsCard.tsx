import React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export interface StatsCardProps {
  /** Card title/label */
  label: string
  /** Main value to display */
  value: string | number
  /** Icon component from lucide-react */
  icon: LucideIcon
  /** Trend percentage (positive or negative) */
  trend?: number
  /** Description of the trend period */
  trendLabel?: string
  /** Color theme for the card */
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'red'
  /** Loading state */
  loading?: boolean
  /** Additional className */
  className?: string
}

/**
 * StatsCard Component
 * Displays a single statistic with icon, value, label, and optional trend indicator
 */
export function StatsCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel = 'vs. periodo anterior',
  color = 'blue',
  loading = false,
  className,
}: StatsCardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      icon: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      icon: 'text-green-600 dark:text-green-400',
      iconBg: 'bg-green-100 dark:bg-green-900/40',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      icon: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-100 dark:bg-purple-900/40',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      icon: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      icon: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-100 dark:bg-red-900/40',
    },
  }

  const colors = colorClasses[color]

  // Determine trend icon and color
  const getTrendDisplay = () => {
    if (trend === undefined || trend === null) return null

    const isPositive = trend > 0
    const isNeutral = trend === 0
    const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown
    const trendColor = isNeutral
      ? 'text-gray-500'
      : isPositive
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400'

    return (
      <div className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}>
        <TrendIcon className="h-4 w-4" />
        <span>{isPositive ? '+' : ''}{trend.toFixed(1)}%</span>
      </div>
    )
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
            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-3 rounded-lg', colors.iconBg)}>
          <Icon className={cn('h-6 w-6', colors.icon)} />
        </div>
        {getTrendDisplay()}
      </div>

      <div className="space-y-1">
        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        {trend !== undefined && trend !== null && trendLabel && (
          <p className="text-xs text-gray-400 dark:text-gray-500">{trendLabel}</p>
        )}
      </div>
    </div>
  )
}
