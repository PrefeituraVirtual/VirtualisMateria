import React, { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  AlertCircle,
  CheckCircle,
  Info,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import type { Insight, InsightsResponse } from './types'
import { adminDataAnalystService } from '@/lib/api'

/**
 * Severity styles for insight cards
 */
const SEVERITY_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-600 dark:text-yellow-400',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
  },
}

/**
 * Get icon component based on severity
 */
const getIconComponent = (severity: string) => {
  switch (severity) {
    case 'warning':
    case 'error':
      return AlertCircle
    case 'success':
      return CheckCircle
    case 'info':
    default:
      return Info
  }
}

/**
 * Props for InsightCards component
 */
export interface InsightCardsProps {
  /** Period filter for insights */
  period?: '7d' | '30d'
  /** Callback when an action is clicked */
  onActionClick?: (action: string) => void
  /** Additional className */
  className?: string
}

/**
 * InsightCards Component
 * Displays AI-generated insights with metrics and actionable suggestions
 */
export function InsightCards({ period = '7d', onActionClick, className }: InsightCardsProps) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load insights from API
   */
  const loadInsights = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await adminDataAnalystService.getInsights({ period })
      const data = response as InsightsResponse

      if (data?.insights && Array.isArray(data.insights)) {
        setInsights(data.insights)
      } else {
        setInsights([])
      }
    } catch (err) {
      console.error('Error loading insights:', err)
      setError('Erro ao carregar insights')
      setInsights([])
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    loadInsights()
  }, [loadInsights])

  /**
   * Handle action button click
   */
  const handleActionClick = (insight: Insight) => {
    if (insight.action && onActionClick) {
      onActionClick(insight.action)
    }
  }

  /**
   * Format percentage change
   */
  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }

  /**
   * Loading skeleton
   */
  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Carregando insights...</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse"
            >
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded" />
                  <div className="h-3 w-2/3 bg-gray-100 dark:bg-gray-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  /**
   * Error state with retry
   */
  if (error && insights.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">Insights</span>
          <button
            onClick={loadInsights}
            className="flex items-center gap-1 text-xs text-virtualis-blue-600 hover:text-virtualis-blue-700 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Tentar novamente
          </button>
        </div>
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-center">
          <AlertCircle className="h-5 w-5 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  /**
   * Empty state
   */
  if (insights.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <span className="text-sm text-gray-500 dark:text-gray-400">Insights</span>
        <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-center">
          <Info className="h-6 w-6 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nenhum insight disponivel para o periodo selecionado.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Insights ({insights.length})
        </span>
        <button
          onClick={loadInsights}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-virtualis-blue-600 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Atualizar
        </button>
      </div>

      {/* Insight Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, index) => {
          const styles = SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.info
          const IconComponent = getIconComponent(insight.severity)

          return (
            <div
              key={index}
              className={cn(
                'p-4 rounded-xl border transition-all duration-300',
                'hover:shadow-md',
                styles.bg,
                styles.border,
                // Entry animation via CSS
                'animate-in fade-in slide-in-from-bottom-2 duration-300',
                { 'animation-delay-100': index === 1 },
                { 'animation-delay-200': index === 2 },
                { 'animation-delay-300': index === 3 }
              )}
              style={{ animationDelay: `${index * 75}ms` }}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={cn(
                    'p-2 rounded-lg bg-white/50 dark:bg-gray-800/50',
                    styles.icon
                  )}
                >
                  <IconComponent className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    {insight.title}
                  </h4>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {insight.description}
                  </p>

                  {/* Metric */}
                  {insight.metric && (
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-1">
                        <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {insight.metric.current.toLocaleString('pt-BR')}
                        </span>
                        {insight.metric.change !== 0 && (
                          <span
                            className={cn(
                              'flex items-center gap-0.5 text-xs font-medium',
                              insight.metric.change >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            )}
                          >
                            {insight.metric.change >= 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {formatChange(insight.metric.change)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        anterior: {insight.metric.previous.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}

                  {/* Action Button */}
                  {insight.action && onActionClick && (
                    <button
                      onClick={() => handleActionClick(insight)}
                      className={cn(
                        'flex items-center gap-1 text-sm font-medium',
                        'text-virtualis-blue-600 dark:text-virtualis-blue-400',
                        'hover:text-virtualis-blue-700 dark:hover:text-virtualis-blue-300',
                        'transition-colors group'
                      )}
                    >
                      Ver detalhes
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
