import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { ChartConfig, BasicChartType } from './types'
import { CHART_COLORS } from './types'

type ChartDatum = Record<string, unknown>

type RechartsPayloadEntry = {
  color?: string
  name?: string
  value?: number | string
}

/**
 * Props for ResultChart component
 */
export interface ResultChartProps {
  /** Data to visualize */
  data: ChartDatum[]
  /** Chart configuration */
  config: ChartConfig
  /** Loading state */
  loading?: boolean
  /** Height of the chart */
  height?: number
  /** Additional className */
  className?: string
}

/**
 * Custom tooltip component for charts
 */
const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: RechartsPayloadEntry[]
  label?: string
}) => {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
      <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{toLabelValue(label)}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {typeof entry.value === 'number'
                ? new Intl.NumberFormat('pt-BR').format(entry.value)
                : entry.value ?? '-'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Custom legend component
 */
const CustomLegend = ({ payload }: { payload?: RechartsPayloadEntry[] }) => {
  if (!payload) return null

  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600 dark:text-gray-400">{entry.value ?? '-'}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Format Y-axis tick values
 */
const formatYAxisTick = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return String(value)
}

const toNumberValue = (value: unknown): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value)
  }
  return 0
}

/**
 * Format label value, detecting dates
 */
const toLabelValue = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  const strVal = typeof value === 'string' ? value : String(value)

  // Detect ISO Date (YYYY-MM-DDT...)
  // Regex looks for YYYY-MM-DD or YYYY-MM-DDTHH...
  if (/^\d{4}-\d{2}-\d{2}(T|\s|$)/.test(strVal)) {
    const date = new Date(strVal)
    if (!isNaN(date.getTime())) {
      // Format as DD/MM/YYYY
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }
  }

  return strVal
}

/**
 * Render Line Chart
 */
const renderLineChart = (
  data: ChartDatum[],
  config: ChartConfig,
  colors: string[]
) => (
  <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
    <CartesianGrid
      strokeDasharray="3 3"
      stroke="currentColor"
      className="text-gray-200 dark:text-gray-700"
      vertical={false}
    />
    <XAxis
      dataKey={config.xAxisKey}
      tickFormatter={toLabelValue} 
      tick={{ fontSize: 12 }}
      tickLine={false}
      axisLine={{ stroke: 'currentColor' }}
      className="text-gray-500 dark:text-gray-400"
    />
    <YAxis
      tickFormatter={formatYAxisTick}
      tick={{ fontSize: 12 }}
      tickLine={false}
      axisLine={{ stroke: 'currentColor' }}
      className="text-gray-500 dark:text-gray-400"
    />
    <Tooltip content={<CustomTooltip />} />
    {config.showLegend !== false && <Legend content={<CustomLegend />} />}
    {config.yAxisKeys.map((key, index) => (
      <Line
        key={key}
        type="monotone"
        dataKey={key}
        name={key}
        stroke={colors[index % colors.length]}
        strokeWidth={2}
        dot={{ r: 4, fill: colors[index % colors.length] }}
        activeDot={{ r: 6 }}
      />
    ))}
  </LineChart>
)

/**
 * Render Bar Chart
 */
const renderBarChart = (
  data: ChartDatum[],
  config: ChartConfig,
  colors: string[]
) => (
  <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
    <CartesianGrid
      strokeDasharray="3 3"
      stroke="currentColor"
      className="text-gray-200 dark:text-gray-700"
      vertical={false}
    />
    <XAxis
      dataKey={config.xAxisKey}
      tickFormatter={toLabelValue}
      tick={{ fontSize: 12 }}
      tickLine={false}
      axisLine={{ stroke: 'currentColor' }}
      className="text-gray-500 dark:text-gray-400"
    />
    <YAxis
      tickFormatter={formatYAxisTick}
      tick={{ fontSize: 12 }}
      tickLine={false}
      axisLine={{ stroke: 'currentColor' }}
      className="text-gray-500 dark:text-gray-400"
    />
    <Tooltip content={<CustomTooltip />} />
    {config.showLegend !== false && <Legend content={<CustomLegend />} />}
    {config.yAxisKeys.map((key, index) => (
      <Bar
        key={key}
        dataKey={key}
        name={key}
        fill={colors[index % colors.length]}
        radius={[4, 4, 0, 0]}
      />
    ))}
  </BarChart>
)

/**
 * Render Pie Chart
 */
const renderPieChart = (
  data: ChartDatum[],
  config: ChartConfig,
  colors: string[]
) => {
  // For pie chart, we need to transform data if needed
  const pieData = data.map((item, index) => ({
    name: toLabelValue(item[config.xAxisKey]),
    value: toNumberValue(item[config.yAxisKeys[0]]),
    color: colors[index % colors.length],
  }))

  return (
    <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
      <Pie
        data={pieData}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={100}
        innerRadius={60}
        paddingAngle={2}
        label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
        labelLine={{ stroke: 'currentColor' }}
      >
        {pieData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
      <Tooltip content={<CustomTooltip />} />
      {config.showLegend !== false && <Legend content={<CustomLegend />} />}
    </PieChart>
  )
}

/**
 * Render Area Chart
 */
const renderAreaChart = (
  data: ChartDatum[],
  config: ChartConfig,
  colors: string[]
) => (
  <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
    <defs>
      {config.yAxisKeys.map((key, index) => (
        <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={colors[index % colors.length]} stopOpacity={0.3} />
          <stop offset="95%" stopColor={colors[index % colors.length]} stopOpacity={0} />
        </linearGradient>
      ))}
    </defs>
    <CartesianGrid
      strokeDasharray="3 3"
      stroke="currentColor"
      className="text-gray-200 dark:text-gray-700"
    />
    <XAxis
      dataKey={config.xAxisKey}
      tickFormatter={toLabelValue}
      tick={{ fontSize: 12 }}
      tickLine={false}
      axisLine={{ stroke: 'currentColor' }}
      className="text-gray-500 dark:text-gray-400"
    />
    <YAxis
      tickFormatter={formatYAxisTick}
      tick={{ fontSize: 12 }}
      tickLine={false}
      axisLine={{ stroke: 'currentColor' }}
      className="text-gray-500 dark:text-gray-400"
    />
    <Tooltip content={<CustomTooltip />} />
    {config.showLegend !== false && <Legend content={<CustomLegend />} />}
    {config.yAxisKeys.map((key, index) => (
      <Area
        key={key}
        type="monotone"
        dataKey={key}
        name={key}
        stroke={colors[index % colors.length]}
        strokeWidth={2}
        fill={`url(#gradient-${key})`}
      />
    ))}
  </AreaChart>
)

/**
 * Chart type renderer map for basic chart types
 * Advanced chart types (heatmap, treemap, gauge) are handled by AdvancedCharts component
 */
const chartRenderers: Record<
  BasicChartType,
  (data: ChartDatum[], config: ChartConfig, colors: string[]) => React.ReactNode
> = {
  line: renderLineChart,
  bar: renderBarChart,
  pie: renderPieChart,
  area: renderAreaChart,
}

/**
 * ResultChart Component
 * Renders appropriate chart based on configuration using Recharts
 */
export function ResultChart({
  data,
  config,
  loading = false,
  height = 350,
  className,
}: ResultChartProps) {
  /**
   * Merge custom colors with defaults
   */
  const colors = useMemo(() => {
    return config.colors?.length ? config.colors : CHART_COLORS
  }, [config.colors])

  /**
   * Render loading skeleton
   */
  if (loading) {
    return (
      <div
        className={cn(
          'rounded-xl border border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-gray-900',
          className
        )}
        style={{ height }}
      >
        <div className="animate-pulse h-full flex flex-col">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
          <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded" />
        </div>
      </div>
    )
  }

  /**
   * Render empty state
   */
  if (!data || data.length === 0) {
    return (
      <div
        className={cn(
          'rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-8',
          'flex items-center justify-center text-gray-500 dark:text-gray-400',
          className
        )}
        style={{ height }}
      >
        Nenhum dado para visualizar
      </div>
    )
  }

  /**
   * Validate config
   */
  if (!config.xAxisKey || !config.yAxisKeys?.length) {
    return (
      <div
        className={cn(
          'rounded-xl border border-dashed border-amber-200 dark:border-amber-700 p-8',
          'flex items-center justify-center text-amber-600 dark:text-amber-400',
          className
        )}
        style={{ height }}
      >
        Configuracao de grafico incompleta
      </div>
    )
  }

  // Check if this is a basic chart type that we can render
  const isBasicType = config.type in chartRenderers
  if (!isBasicType) {
    return (
      <div
        className={cn(
          'rounded-xl border border-dashed border-amber-200 dark:border-amber-700 p-8',
          'flex items-center justify-center text-amber-600 dark:text-amber-400',
          className
        )}
        style={{ height }}
      >
        Use AdvancedCharts component for {config.type} chart type
      </div>
    )
  }

  const renderer = chartRenderers[config.type as BasicChartType]

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-gray-900',
        className
      )}
    >
      {/* Chart Title */}
      {config.title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {config.title}
        </h3>
      )}

      {/* Chart Container */}
      <ResponsiveContainer width="100%" height={height}>
        {renderer(data, config, colors)}
      </ResponsiveContainer>
    </div>
  )
}
