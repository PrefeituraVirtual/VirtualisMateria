import React, { useMemo, useState } from 'react'
import { LazyMotion, m } from 'framer-motion'
import { cn } from '@/lib/utils'

const loadMotionFeatures = () => import('framer-motion').then((mod) => mod.domAnimation)

export interface TrendDataPoint {
  /** Date string (e.g., '2024-01-15') */
  date: string
  /** Value for conversations */
  conversations?: number
  /** Value for messages */
  messages?: number
  /** Value for tokens used */
  tokens?: number
}

export interface TrendsChartProps {
  /** Array of data points */
  data: TrendDataPoint[]
  /** Selected period */
  period: '7d' | '30d' | '90d'
  /** Callback when period changes */
  onPeriodChange: (period: '7d' | '30d' | '90d') => void
  /** Loading state */
  loading?: boolean
  /** Additional className */
  className?: string
}

const PERIOD_LABELS: Record<'7d' | '30d' | '90d', string> = {
  '7d': '7 dias',
  '30d': '30 dias',
  '90d': '90 dias',
}

const PERIOD_SUBTITLE: Record<'7d' | '30d' | '90d', string> = {
  '7d': 'Visão rápida da última semana',
  '30d': 'Tendência consolidada do último mês',
  '90d': 'Análise histórica trimestral',
}

const SERIES_COLORS = {
  conversations: '#3b82f6', // Blue
  messages: '#f59e0b', // Virtualis Gold
}

const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(Math.round(value))

/**
 * TrendsChart Component
 * Displays usage trends over time with period selector
 * Uses Framer Motion for smooth SVG animations
 */
export function TrendsChart({
  data,
  period,
  onPeriodChange,
  loading = false,
  className,
}: TrendsChartProps) {
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    value: number
    date: Date
    series: string
    color: string
  } | null>(null)

  // Parse date string as local date (avoiding timezone issues)
  function parseLocalDate(dateStr: string): Date {
    // Parse "2026-01-08" as local date, not UTC
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  // Calculate chart data
  const chart = useMemo(() => {
    if (!data || data.length === 0) return null

    const parsed = data.map((point) => ({
      ...point,
      dateObj: parseLocalDate(point.date),
    }))

    const maxValue = Math.max(
      1,
      ...parsed.map((p) => Math.max(p.conversations || 0, p.messages || 0))
    )

    const width = 720
    const height = 260
    const paddingX = 56
    const paddingY = 32
    const chartWidth = width - paddingX * 2
    const chartHeight = height - paddingY * 2
    const step = parsed.length > 1 ? chartWidth / (parsed.length - 1) : 0

    const xForIndex = (index: number) => paddingX + index * step
    const yForValue = (value: number) => paddingY + (1 - value / maxValue) * chartHeight

    const buildPath = (values: number[]) =>
      values
        .map((value, index) => {
          const x = xForIndex(index)
          const y = yForValue(value)
          return `${index === 0 ? 'M' : 'L'}${x} ${y}`
        })
        .join(' ')

    const conversationPath = buildPath(parsed.map((p) => p.conversations || 0))
    const messagesPath = buildPath(parsed.map((p) => p.messages || 0))

    const dots = parsed.map((p, index) => ({
      conversations: { x: xForIndex(index), y: yForValue(p.conversations || 0), value: p.conversations || 0 },
      messages: { x: xForIndex(index), y: yForValue(p.messages || 0), value: p.messages || 0 },
      date: p.dateObj,
    }))

    const yTicks = Array.from({ length: 5 }).map((_, idx, arr) => {
      const ratio = idx / (arr.length - 1 || 1)
      return {
        value: maxValue - ratio * maxValue,
        y: paddingY + ratio * chartHeight,
      }
    })

    const labelCount = Math.min(parsed.length, 6)
    const labelStep = parsed.length <= 1 ? 1 : Math.max(1, Math.floor(parsed.length / labelCount))

    const xLabels = parsed
      .map((point, index) => {
        const isEdge = index === parsed.length - 1
        if (index % labelStep !== 0 && !isEdge) return null
        return {
          x: xForIndex(index),
          label: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(point.dateObj),
        }
      })
      .filter(Boolean) as Array<{ x: number; label: string }>

    return {
      width,
      height,
      paddingX,
      paddingY,
      conversationPath,
      messagesPath,
      dots,
      yTicks,
      xLabels,
      maxValue,
    }
  }, [data])

  // Format date for display
  function formatDate(date: Date) {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(date)
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
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="h-[260px] bg-gray-100 dark:bg-gray-800 rounded" />
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
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Tendencias de Uso
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {PERIOD_SUBTITLE[period]}
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(Object.keys(PERIOD_LABELS) as Array<'7d' | '30d' | '90d'>).map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                period === p
                  ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
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
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SERIES_COLORS.conversations }} />
          <span className="text-sm text-gray-600 dark:text-gray-400">Conversas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SERIES_COLORS.messages }} />
          <span className="text-sm text-gray-600 dark:text-gray-400">Mensagens</span>
        </div>
      </div>

      {/* Chart */}
      {!chart || data.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          Nenhum dado disponivel para o periodo selecionado
        </div>
      ) : (
        <LazyMotion features={loadMotionFeatures} strict>
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${chart.width} ${chart.height}`}
              className="w-full min-w-[560px] h-72 text-gray-400"
              role="img"
              aria-label={`Gráfico de linhas para ${PERIOD_LABELS[period]}`}
            >
              {/* Grid lines and Y-axis labels */}
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

              {/* Animated line for conversations */}
              <m.path
                d={chart.conversationPath}
                fill="none"
                stroke={SERIES_COLORS.conversations}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />

              {/* Animated dashed line for messages */}
              <m.path
                d={chart.messagesPath}
                fill="none"
                stroke={SERIES_COLORS.messages}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="8 4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
              />

              {/* Animated data points */}
              {chart.dots.map((dot, index) => (
                <g key={`dot-${index}`}>
                  {/* Conversation dot */}
                  <m.circle
                    cx={dot.conversations.x}
                    cy={dot.conversations.y}
                    r={4.5}
                    fill={SERIES_COLORS.conversations}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: 0.2 + index * 0.04,
                      type: 'spring',
                      stiffness: 180,
                      damping: 12
                    }}
                    onMouseEnter={(e: React.MouseEvent) => {
                      setTooltip({
                        x: e.clientX,
                        y: e.clientY,
                        value: dot.conversations.value,
                        date: dot.date,
                        series: 'Conversas',
                        color: SERIES_COLORS.conversations,
                      })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                  />
                  {/* Message dot */}
                  <m.circle
                    cx={dot.messages.x}
                    cy={dot.messages.y}
                    r={4}
                    fill={SERIES_COLORS.messages}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: 0.25 + index * 0.04,
                      type: 'spring',
                      stiffness: 180,
                      damping: 12
                    }}
                    onMouseEnter={(e: React.MouseEvent) => {
                      setTooltip({
                        x: e.clientX,
                        y: e.clientY,
                        value: dot.messages.value,
                        date: dot.date,
                        series: 'Mensagens',
                        color: SERIES_COLORS.messages,
                      })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                  />
                </g>
              ))}

              {/* X-axis labels */}
              {chart.xLabels.map((tick, idx) => (
                <text
                  key={`x-${idx}`}
                  x={tick.x}
                  y={chart.height - chart.paddingY + 24}
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
          className="fixed z-50 pointer-events-none p-3 rounded-xl bg-white/90 dark:bg-gray-800/95 backdrop-blur-md shadow-xl border border-gray-200 dark:border-gray-700 text-sm transform -translate-x-1/2 -translate-y-full mt-[-8px]"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {formatDate(tooltip.date)}
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: tooltip.color }}
            />
            <span className="text-gray-600 dark:text-gray-300">
              {tooltip.series}:
            </span>
            <span className="font-bold text-gray-900 dark:text-gray-100">
              {formatNumber(tooltip.value)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
