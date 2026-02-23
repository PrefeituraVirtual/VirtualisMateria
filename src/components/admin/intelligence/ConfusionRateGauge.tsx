import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { AlertTriangle, ArrowUp, ArrowDown, Minus } from 'lucide-react'

/**
 * Props for ConfusionRateGauge component
 */
export interface ConfusionRateGaugeProps {
  /** Current confusion rate (0 to 1) */
  rate: number
  /** Target threshold for acceptable confusion (0 to 1) */
  target: number
  /** Trend direction compared to previous period */
  trend: 'up' | 'down' | 'stable'
  /** Percentage change from previous period */
  change?: number
  /** Loading state */
  loading?: boolean
  /** Additional className */
  className?: string
  /** Optional label for the metric */
  label?: string
  /** Optional subtitle */
  subtitle?: string
  /** Show automatic alert when rate exceeds target */
  autoAlert?: boolean
}

/**
 * Color thresholds for gauge
 * Green: < 15%
 * Yellow: 15-30%
 * Red: > 30%
 */
const getGaugeColor = (rate: number): { fill: string; stroke: string; bg: string; text: string } => {
  const percentage = rate * 100

  if (percentage < 15) {
    return {
      fill: '#10b981', // Green
      stroke: '#059669',
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-600 dark:text-green-400',
    }
  }
  if (percentage < 30) {
    return {
      fill: '#f59e0b', // Yellow/Amber
      stroke: '#d97706',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-600 dark:text-amber-400',
    }
  }
  return {
    fill: '#ef4444', // Red
    stroke: '#dc2626',
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-600 dark:text-red-400',
  }
}

/**
 * Get status label based on rate
 */
const getStatusLabel = (rate: number): string => {
  const percentage = rate * 100
  if (percentage < 15) return 'Excelente'
  if (percentage < 30) return 'Atencao'
  return 'Critico'
}

/**
 * Get trend icon component
 */
const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up':
      return <ArrowUp className="h-4 w-4" />
    case 'down':
      return <ArrowDown className="h-4 w-4" />
    default:
      return <Minus className="h-4 w-4" />
  }
}

/**
 * ConfusionRateGauge Component
 * Displays a radial gauge showing the confusion rate with color-coded status
 */
export function ConfusionRateGauge({
  rate,
  target,
  trend,
  change,
  loading = false,
  className,
  label = 'Taxa de Confusao',
  subtitle,
  autoAlert = false,
}: ConfusionRateGaugeProps) {
  /**
   * Calculate gauge arc values
   */
  const gaugeData = useMemo(() => {
    // Clamp rate between 0 and 1
    const clampedRate = Math.max(0, Math.min(1, rate))
    const clampedTarget = Math.max(0, Math.min(1, target))

    // SVG arc calculations
    const size = 200
    const strokeWidth = 16
    const radius = (size - strokeWidth) / 2
    const circumference = Math.PI * radius // Half circle
    const center = size / 2

    // Arc starts from left (-180deg) to right (0deg)
    const startAngle = -180
    const endAngle = 0
    const angleRange = endAngle - startAngle

    // Calculate filled arc length
    const filledAngle = startAngle + angleRange * clampedRate
    const targetAngle = startAngle + angleRange * clampedTarget

    // Convert to radians for SVG path
    const startRad = (startAngle * Math.PI) / 180
    const filledRad = (filledAngle * Math.PI) / 180
    const targetRad = (targetAngle * Math.PI) / 180

    // Calculate arc end points
    const startX = center + radius * Math.cos(startRad)
    const startY = center + radius * Math.sin(startRad)
    const filledX = center + radius * Math.cos(filledRad)
    const filledY = center + radius * Math.sin(filledRad)
    const targetX = center + radius * Math.cos(targetRad)
    const targetY = center + radius * Math.sin(targetRad)

    // Determine if arc is larger than 180 degrees
    const largeArcFlag = clampedRate > 0.5 ? 1 : 0

    return {
      size,
      strokeWidth,
      radius,
      center,
      circumference,
      clampedRate,
      clampedTarget,
      paths: {
        background: `M ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${center + radius} ${center}`,
        filled: clampedRate > 0
          ? `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${filledX} ${filledY}`
          : '',
        target: { x: targetX, y: targetY },
      },
    }
  }, [rate, target])

  const colors = getGaugeColor(rate)
  const statusLabel = getStatusLabel(rate)

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
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
              <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
          <div className="flex justify-center">
            <div className="h-32 w-48 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
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
      <div className="flex items-center gap-3 mb-4">
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <AlertTriangle className={cn('h-5 w-5', colors.text)} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {label}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Gauge SVG */}
      <div className="flex flex-col items-center">
        <svg
          width={gaugeData.size}
          height={gaugeData.size / 2 + 20}
          viewBox={`0 0 ${gaugeData.size} ${gaugeData.size / 2 + 20}`}
          className="overflow-visible"
          role="img"
          aria-label={`Taxa de confusao: ${(rate * 100).toFixed(1)}%`}
        >
          {/* Background arc */}
          <path
            d={gaugeData.paths.background}
            fill="none"
            stroke="currentColor"
            strokeWidth={gaugeData.strokeWidth}
            strokeLinecap="round"
            className="text-gray-200 dark:text-gray-700"
          />

          {/* Filled arc */}
          {gaugeData.paths.filled && (
            <path
              d={gaugeData.paths.filled}
              fill="none"
              stroke={colors.fill}
              strokeWidth={gaugeData.strokeWidth}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
              }}
            />
          )}

          {/* Target indicator line */}
          <line
            x1={gaugeData.paths.target.x}
            y1={gaugeData.paths.target.y - gaugeData.strokeWidth / 2 - 4}
            x2={gaugeData.paths.target.x}
            y2={gaugeData.paths.target.y + gaugeData.strokeWidth / 2 + 4}
            stroke="#374151"
            strokeWidth={2}
            strokeDasharray="4 2"
            className="dark:stroke-gray-400"
          />

          {/* Target label */}
          <text
            x={gaugeData.paths.target.x}
            y={gaugeData.paths.target.y - gaugeData.strokeWidth / 2 - 10}
            textAnchor="middle"
            fontSize={10}
            className="fill-gray-500 dark:fill-gray-400"
          >
            Meta
          </text>

          {/* Percentage value */}
          <text
            x={gaugeData.center}
            y={gaugeData.center - 10}
            textAnchor="middle"
            fontSize={36}
            fontWeight="bold"
            className="fill-gray-900 dark:fill-gray-100"
          >
            {(rate * 100).toFixed(1)}%
          </text>

          {/* Status label */}
          <text
            x={gaugeData.center}
            y={gaugeData.center + 20}
            textAnchor="middle"
            fontSize={14}
            fontWeight="500"
            fill={colors.fill}
          >
            {statusLabel}
          </text>
        </svg>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600 dark:text-gray-400">&lt;15%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-gray-600 dark:text-gray-400">15-30%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600 dark:text-gray-400">&gt;30%</span>
          </div>
        </div>
      </div>

      {/* Trend indicator */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Tendencia:</span>
            <div
              className={cn(
                'flex items-center gap-1 text-sm font-medium',
                // For confusion rate, down is good (green) and up is bad (red)
                trend === 'down'
                  ? 'text-green-600 dark:text-green-400'
                  : trend === 'up'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {getTrendIcon(trend)}
              {change !== undefined && (
                <span>
                  {change > 0 ? '+' : ''}
                  {change.toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          <div className="text-sm">
            <span className="text-gray-500 dark:text-gray-400">Meta: </span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {(target * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Status message */}
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {rate <= target
            ? 'A taxa de confusao esta dentro da meta estabelecida.'
            : `A taxa de confusao esta ${((rate - target) * 100).toFixed(1)}% acima da meta.`}
        </p>
      </div>

      {/* Auto Alert Section */}
      {autoAlert && rate > target && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                Alerta de Taxa Elevada
              </h4>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                A taxa de confusao ({(rate * 100).toFixed(1)}%) excede a meta de {(target * 100).toFixed(0)}%.
                Considere revisar as respostas mais frequentes ou melhorar o treinamento do modelo.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
