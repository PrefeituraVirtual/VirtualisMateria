import React, { useMemo, useState } from 'react'
import { LazyMotion, m } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Smile, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { SentimentData, PeriodOption } from './types'
import { PERIOD_LABELS, SENTIMENT_COLORS } from './types'

const loadMotionFeatures = () => import('framer-motion').then((mod) => mod.domAnimation)

/**
 * Comparison data from previous period
 */
export interface SentimentComparisonData {
  previous_total_positive: number
  previous_total_negative: number
  previous_total_neutral: number
}

/**
 * Props for SentimentTrendChart component
 */
export interface SentimentTrendChartProps {
  /** Array of sentiment data points */
  data: SentimentData[]
  /** Selected time period */
  period: PeriodOption
  /** Callback when period changes */
  onPeriodChange: (period: PeriodOption) => void
  /** Loading state */
  loading?: boolean
  /** Additional className */
  className?: string
  /** Comparison data from previous period */
  comparison?: SentimentComparisonData | null
}

/**
 * Period subtitle descriptions
 */
const PERIOD_SUBTITLE: Record<PeriodOption, string> = {
  '7d': 'Analise de sentimento da ultima semana',
  '30d': 'Tendencia de sentimento do ultimo mes',
  '90d': 'Historico de sentimento trimestral',
}

/**
 * Format number for display
 */
const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(Math.round(value))

/**
 * Parse date string as local date
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
  }).format(date)
}

/**
 * SentimentTrendChart Component
 * Displays a line chart showing sentiment trends over time
 */
export function SentimentTrendChart({
  data,
  period,
  onPeriodChange,
  loading = false,
  className,
  comparison,
}: SentimentTrendChartProps) {
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    data: SentimentData
    date: Date
  } | null>(null)

  /**
   * Calculate chart dimensions and paths
   */
  const chart = useMemo(() => {
    if (!data || data.length === 0) return null

    const parsed = data.map((point) => ({
      ...point,
      dateObj: parseLocalDate(point.date),
      total: point.positive + point.negative + point.neutral,
    }))

    // Find max value for scaling
    const maxValue = Math.max(
      1,
      ...parsed.map((p) => Math.max(p.positive, p.negative, p.neutral))
    )

    // Chart dimensions
    const width = 720
    const height = 280
    const paddingX = 56
    const paddingY = 40
    const chartWidth = width - paddingX * 2
    const chartHeight = height - paddingY * 2
    const step = parsed.length > 1 ? chartWidth / (parsed.length - 1) : 0

    // Helper functions
    const xForIndex = (index: number) => paddingX + index * step
    const yForValue = (value: number) => paddingY + (1 - value / maxValue) * chartHeight

    // Build SVG paths for each sentiment
    const buildPath = (values: number[]) =>
      values
        .map((value, index) => {
          const x = xForIndex(index)
          const y = yForValue(value)
          return `${index === 0 ? 'M' : 'L'}${x} ${y}`
        })
        .join(' ')

    // Build area path (for filled gradient)
    const buildAreaPath = (values: number[]) => {
      const linePath = values
        .map((value, index) => {
          const x = xForIndex(index)
          const y = yForValue(value)
          return `${index === 0 ? 'M' : 'L'}${x} ${y}`
        })
        .join(' ')

      // Close the path
      const lastX = xForIndex(values.length - 1)
      const firstX = xForIndex(0)
      const bottomY = paddingY + chartHeight

      return `${linePath} L${lastX} ${bottomY} L${firstX} ${bottomY} Z`
    }

    const paths = {
      positive: buildPath(parsed.map((p) => p.positive)),
      negative: buildPath(parsed.map((p) => p.negative)),
      neutral: buildPath(parsed.map((p) => p.neutral)),
      positiveArea: buildAreaPath(parsed.map((p) => p.positive)),
    }

    // Data points for interaction
    const dots = parsed.map((p, index) => ({
      positive: { x: xForIndex(index), y: yForValue(p.positive), value: p.positive },
      negative: { x: xForIndex(index), y: yForValue(p.negative), value: p.negative },
      neutral: { x: xForIndex(index), y: yForValue(p.neutral), value: p.neutral },
      date: p.dateObj,
      data: p,
    }))

    // Y-axis ticks
    const yTicks = Array.from({ length: 5 }).map((_, idx, arr) => {
      const ratio = idx / (arr.length - 1 || 1)
      return {
        value: maxValue - ratio * maxValue,
        y: paddingY + ratio * chartHeight,
      }
    })

    // X-axis labels
    const labelCount = Math.min(parsed.length, 7)
    const labelStep = parsed.length <= 1 ? 1 : Math.max(1, Math.floor(parsed.length / labelCount))

    const xLabels = parsed
      .map((point, index) => {
        const isEdge = index === parsed.length - 1
        if (index % labelStep !== 0 && !isEdge) return null
        return {
          x: xForIndex(index),
          label: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(
            point.dateObj
          ),
        }
      })
      .filter(Boolean) as Array<{ x: number; label: string }>

    return {
      width,
      height,
      paddingX,
      paddingY,
      chartHeight,
      paths,
      dots,
      yTicks,
      xLabels,
      maxValue,
    }
  }, [data])

  /**
   * Render loading skeleton
   */
  if (loading) {
    return (
      <div
        className={cn(
          'p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900',
          className
        )}
      >
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="h-[280px] bg-gray-100 dark:bg-gray-800 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900',
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Smile className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Tendencia de Sentimento
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {PERIOD_SUBTITLE[period]}
            </p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(Object.keys(PERIOD_LABELS) as PeriodOption[]).map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                period === p
                  ? 'bg-white dark:bg-gray-700 text-virtualis-blue-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-6 mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: SENTIMENT_COLORS.positive }}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">Positivo</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: SENTIMENT_COLORS.negative }}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">Negativo</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: SENTIMENT_COLORS.neutral }}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">Neutro</span>
        </div>
      </div>

      {/* Chart */}
      {!chart || data.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          Nenhum dado de sentimento disponivel para o periodo
        </div>
      ) : (
        <LazyMotion features={loadMotionFeatures} strict>
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${chart.width} ${chart.height}`}
              className="w-full min-w-[560px] h-72 text-gray-400"
              role="img"
              aria-label={`Grafico de sentimento para ${PERIOD_LABELS[period]}`}
            >
              {/* Gradient definitions */}
              <defs>
                <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SENTIMENT_COLORS.positive} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={SENTIMENT_COLORS.positive} stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {chart.yTicks.map((tick, index) => (
                <g key={`y-${index}`}>
                  <line
                    x1={chart.paddingX - 16}
                    x2={chart.width - chart.paddingX + 16}
                    y1={tick.y}
                    y2={tick.y}
                    stroke="currentColor"
                    strokeOpacity={0.08}
                    strokeDasharray="4 6"
                  />
                  <text
                    x={chart.paddingX - 20}
                    y={tick.y + 4}
                    fontSize={11}
                    fill="currentColor"
                    textAnchor="end"
                  >
                    {formatNumber(tick.value)}
                  </text>
                </g>
              ))}

              {/* Positive area fill */}
              <path d={chart.paths.positiveArea} fill="url(#positiveGradient)" opacity={0.5} />

              {/* Positive line */}
              <m.path
                d={chart.paths.positive}
                fill="none"
                stroke={SENTIMENT_COLORS.positive}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />

              {/* Negative line */}
              <m.path
                d={chart.paths.negative}
                fill="none"
                stroke={SENTIMENT_COLORS.negative}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
              />

              {/* Neutral line */}
              <m.path
                d={chart.paths.neutral}
                fill="none"
                stroke={SENTIMENT_COLORS.neutral}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="6 4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              />

              {/* Interactive data points */}
              {chart.dots.map((dot, index) => (
                <g key={`dots-${index}`}>
                  {/* Invisible hover area */}
                  <rect
                    x={dot.positive.x - 20}
                    y={chart.paddingY}
                    width={40}
                    height={chart.chartHeight}
                    fill="transparent"
                    onMouseEnter={(e: React.MouseEvent) => {
                      setTooltip({
                        x: e.clientX,
                        y: e.clientY,
                        data: dot.data,
                        date: dot.date,
                      })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    className="cursor-pointer"
                  />

                  {/* Positive dot */}
                  <m.circle
                    cx={dot.positive.x}
                    cy={dot.positive.y}
                    r={4}
                    fill={SENTIMENT_COLORS.positive}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.03, type: 'spring' }}
                  />

                  {/* Negative dot */}
                  <m.circle
                    cx={dot.negative.x}
                    cy={dot.negative.y}
                    r={4}
                    fill={SENTIMENT_COLORS.negative}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.35 + index * 0.03, type: 'spring' }}
                  />

                  {/* Neutral dot */}
                  <m.circle
                    cx={dot.neutral.x}
                    cy={dot.neutral.y}
                    r={3}
                    fill={SENTIMENT_COLORS.neutral}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4 + index * 0.03, type: 'spring' }}
                  />
                </g>
              ))}

              {/* X-axis labels */}
              {chart.xLabels.map((tick, idx) => (
                <text
                  key={`x-${idx}`}
                  x={tick.x}
                  y={chart.height - 8}
                  fontSize={11}
                  fill="currentColor"
                  textAnchor="middle"
                >
                  {tick.label}
                </text>
              ))}
            </svg>
          </div>
        </LazyMotion>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none p-4 rounded-xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-xl border border-gray-200 dark:border-gray-700 transform -translate-x-1/2 -translate-y-full mt-[-8px]"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {formatDate(tooltip.date)}
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: SENTIMENT_COLORS.positive }}
              />
              <span className="text-gray-600 dark:text-gray-300">Positivo:</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {formatNumber(tooltip.data.positive)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: SENTIMENT_COLORS.negative }}
              />
              <span className="text-gray-600 dark:text-gray-300">Negativo:</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {formatNumber(tooltip.data.negative)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: SENTIMENT_COLORS.neutral }}
              />
              <span className="text-gray-600 dark:text-gray-300">Neutro:</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {formatNumber(tooltip.data.neutral)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {chart && data.length > 0 && (() => {
        const currentPositive = data.reduce((sum, d) => sum + d.positive, 0)
        const currentNegative = data.reduce((sum, d) => sum + d.negative, 0)
        const currentNeutral = data.reduce((sum, d) => sum + d.neutral, 0)

        // Calculate percentage changes
        const calcChange = (current: number, previous: number): number => {
          if (previous === 0) return current > 0 ? 100 : 0
          return ((current - previous) / previous) * 100
        }

        const positiveChange = comparison ? calcChange(currentPositive, comparison.previous_total_positive) : null
        const negativeChange = comparison ? calcChange(currentNegative, comparison.previous_total_negative) : null
        const neutralChange = comparison ? calcChange(currentNeutral, comparison.previous_total_neutral) : null

        return (
          <>
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatNumber(currentPositive)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Positivo</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatNumber(currentNegative)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Negativo</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                  {formatNumber(currentNeutral)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Neutro</p>
              </div>
            </div>

            {/* Comparison with Previous Period */}
            {comparison && (positiveChange !== null || negativeChange !== null || neutralChange !== null) && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 text-center">
                  vs. periodo anterior
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {/* Positive delta */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {positiveChange !== null && positiveChange > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" aria-label="Aumento" />
                      ) : positiveChange !== null && positiveChange < 0 ? (
                        <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" aria-label="Reducao" />
                      ) : (
                        <Minus className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-label="Estavel" />
                      )}
                      <span className={cn(
                        'text-sm font-medium',
                        positiveChange !== null && positiveChange > 0 && 'text-green-600 dark:text-green-400',
                        positiveChange !== null && positiveChange < 0 && 'text-red-600 dark:text-red-400',
                        (positiveChange === null || positiveChange === 0) && 'text-gray-500 dark:text-gray-400'
                      )}>
                        {positiveChange !== null ? `${positiveChange > 0 ? '+' : ''}${positiveChange.toFixed(1)}%` : '0%'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Positivo</p>
                  </div>
                  {/* Negative delta - inverted colors: down is good */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {negativeChange !== null && negativeChange > 0 ? (
                        <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400" aria-label="Aumento" />
                      ) : negativeChange !== null && negativeChange < 0 ? (
                        <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" aria-label="Reducao" />
                      ) : (
                        <Minus className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-label="Estavel" />
                      )}
                      <span className={cn(
                        'text-sm font-medium',
                        negativeChange !== null && negativeChange > 0 && 'text-red-600 dark:text-red-400',
                        negativeChange !== null && negativeChange < 0 && 'text-green-600 dark:text-green-400',
                        (negativeChange === null || negativeChange === 0) && 'text-gray-500 dark:text-gray-400'
                      )}>
                        {negativeChange !== null ? `${negativeChange > 0 ? '+' : ''}${negativeChange.toFixed(1)}%` : '0%'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Negativo</p>
                  </div>
                  {/* Neutral delta */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {neutralChange !== null && neutralChange > 0 ? (
                        <TrendingUp className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-label="Aumento" />
                      ) : neutralChange !== null && neutralChange < 0 ? (
                        <TrendingDown className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-label="Reducao" />
                      ) : (
                        <Minus className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-label="Estavel" />
                      )}
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {neutralChange !== null ? `${neutralChange > 0 ? '+' : ''}${neutralChange.toFixed(1)}%` : '0%'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Neutro</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )
      })()}
    </div>
  )
}
