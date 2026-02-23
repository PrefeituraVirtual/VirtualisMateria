import React, { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Target } from 'lucide-react'
import type { IntentData } from './types'

/**
 * Props for IntentBreakdownChart component
 */
export interface IntentBreakdownChartProps {
  /** Array of intent distribution data */
  data: IntentData[]
  /** Loading state */
  loading?: boolean
  /** Additional className */
  className?: string
  /** Callback when an intent segment is clicked */
  onIntentClick?: (intent: IntentData) => void
}

/**
 * Default colors for intent categories - Paleta azul Virtualis
 */
const DEFAULT_COLORS = [
  '#1669B6', // Virtualis Blue (primary)
  '#10b981', // Green
  '#2A89D1', // Secondary Blue
  '#2F95CF', // Light Blue
  '#49CFEA', // Accent Blue
  '#64748b', // Slate
  '#06b6d4', // Cyan
  '#0ea5e9', // Sky Blue
  '#0284c7', // Light Blue 600
  '#0369a1', // Light Blue 700
]

/**
 * Get color for intent at index
 */
const getColor = (intent: IntentData, index: number): string => {
  return intent.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
}

/**
 * Format number with locale
 */
const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value)

/**
 * Calculate donut chart segments
 */
interface DonutSegment {
  intent: IntentData
  color: string
  startAngle: number
  endAngle: number
  percentage: number
  path: string
  labelPosition: { x: number; y: number }
}

/**
 * IntentBreakdownChart Component
 * Displays a donut chart showing the distribution of user intents
 */
export function IntentBreakdownChart({
  data,
  loading = false,
  className,
  onIntentClick,
}: IntentBreakdownChartProps) {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null)
  const [selectedIntent, setSelectedIntent] = useState<IntentData | null>(null)

  /**
   * Calculate donut segments
   */
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null

    // Sort by count descending
    const sorted = [...data].sort((a, b) => b.count - a.count)
    const total = sorted.reduce((sum, item) => sum + item.count, 0)

    // Chart dimensions
    const size = 240
    const center = size / 2
    const outerRadius = 100
    const innerRadius = 65 // Creates donut hole

    // Calculate segments
    let currentAngle = -90 // Start from top

    const segments: DonutSegment[] = sorted.map((intent, index) => {
      const percentage = (intent.count / total) * 100
      const angleSpan = (percentage / 100) * 360
      const startAngle = currentAngle
      const endAngle = currentAngle + angleSpan

      // Calculate path
      const startRad = (startAngle * Math.PI) / 180
      const endRad = (endAngle * Math.PI) / 180

      const x1Outer = center + outerRadius * Math.cos(startRad)
      const y1Outer = center + outerRadius * Math.sin(startRad)
      const x2Outer = center + outerRadius * Math.cos(endRad)
      const y2Outer = center + outerRadius * Math.sin(endRad)

      const x1Inner = center + innerRadius * Math.cos(endRad)
      const y1Inner = center + innerRadius * Math.sin(endRad)
      const x2Inner = center + innerRadius * Math.cos(startRad)
      const y2Inner = center + innerRadius * Math.sin(startRad)

      const largeArcFlag = angleSpan > 180 ? 1 : 0

      const path = [
        `M ${x1Outer} ${y1Outer}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer}`,
        `L ${x1Inner} ${y1Inner}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x2Inner} ${y2Inner}`,
        'Z',
      ].join(' ')

      // Label position (middle of segment, slightly outside)
      const midAngle = (startAngle + endAngle) / 2
      const midRad = (midAngle * Math.PI) / 180
      const labelRadius = outerRadius + 20
      const labelPosition = {
        x: center + labelRadius * Math.cos(midRad),
        y: center + labelRadius * Math.sin(midRad),
      }

      currentAngle = endAngle

      return {
        intent: { ...intent, percentage },
        color: getColor(intent, index),
        startAngle,
        endAngle,
        percentage,
        path,
        labelPosition,
      }
    })

    return {
      size,
      center,
      total,
      segments,
    }
  }, [data])

  /**
   * Handle segment click
   */
  const handleSegmentClick = (segment: DonutSegment) => {
    setSelectedIntent(segment.intent)
    onIntentClick?.(segment.intent)
  }

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
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div>
              <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
              <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
          <div className="flex justify-center">
            <div className="h-60 w-60 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  /**
   * Render empty state
   */
  if (!chartData || data.length === 0) {
    return (
      <div
        className={cn(
          'p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900',
          className
        )}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Distribuicao de Intencoes
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Analise das intencoes identificadas nas conversas
            </p>
          </div>
        </div>
        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          Nenhuma intencao identificada no periodo
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
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
          <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Distribuicao de Intencoes
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Analise das intencoes identificadas nas conversas
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-8">
        {/* Donut Chart */}
        <div className="relative flex-shrink-0">
          <svg
            width={chartData.size}
            height={chartData.size}
            viewBox={`0 0 ${chartData.size} ${chartData.size}`}
            className="transform transition-transform"
            role="img"
            aria-label="Grafico de distribuicao de intencoes"
          >
            {/* Segments */}
            {chartData.segments.map((segment, index) => (
              <path
                key={`segment-${index}`}
                d={segment.path}
                fill={segment.color}
                stroke="white"
                strokeWidth={2}
                className={cn(
                  'transition-all duration-200 cursor-pointer',
                  hoveredSegment === index && 'opacity-80'
                )}
                style={{
                  transform:
                    hoveredSegment === index
                      ? `scale(1.03)`
                      : 'scale(1)',
                  transformOrigin: 'center',
                }}
                onMouseEnter={() => setHoveredSegment(index)}
                onMouseLeave={() => setHoveredSegment(null)}
                onClick={() => handleSegmentClick(segment)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSegmentClick(segment)
                  }
                }}
                aria-label={`${segment.intent.intent}: ${segment.percentage.toFixed(1)}%`}
              />
            ))}

            {/* Center text */}
            <text
              x={chartData.center}
              y={chartData.center - 8}
              textAnchor="middle"
              className="fill-gray-900 dark:fill-gray-100"
              fontSize={28}
              fontWeight="bold"
            >
              {formatNumber(chartData.total)}
            </text>
            <text
              x={chartData.center}
              y={chartData.center + 16}
              textAnchor="middle"
              className="fill-gray-500 dark:fill-gray-400"
              fontSize={12}
            >
              Total
            </text>
          </svg>

          {/* Hover tooltip */}
          {hoveredSegment !== null && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {chartData.segments[hoveredSegment].intent.intent}
                </p>
                <p className="text-lg font-bold" style={{ color: chartData.segments[hoveredSegment].color }}>
                  {chartData.segments[hoveredSegment].percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex-1 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {chartData.segments.map((segment, index) => (
              <button
                key={`legend-${index}`}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg transition-all text-left',
                  hoveredSegment === index
                    ? 'bg-gray-100 dark:bg-gray-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                  selectedIntent?.intent === segment.intent.intent &&
                    'ring-2 ring-offset-2 ring-virtualis-blue-500'
                )}
                onMouseEnter={() => setHoveredSegment(index)}
                onMouseLeave={() => setHoveredSegment(null)}
                onClick={() => handleSegmentClick(segment)}
              >
                {/* Color indicator */}
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: segment.color }}
                />

                {/* Intent info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {segment.intent.intent}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatNumber(segment.intent.count)} conversas
                  </p>
                </div>

                {/* Percentage badge */}
                <span
                  className="px-2 py-0.5 rounded text-xs font-semibold"
                  style={{
                    backgroundColor: `${segment.color}20`,
                    color: segment.color,
                  }}
                >
                  {segment.percentage.toFixed(1)}%
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected intent details */}
      {selectedIntent && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Intencao selecionada</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {selectedIntent.intent}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatNumber(selectedIntent.count)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedIntent.percentage?.toFixed(1)}% do total
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
