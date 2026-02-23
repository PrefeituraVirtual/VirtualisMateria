/**
 * AdvancedCharts Component
 * Advanced visualizations including Heatmap, Treemap, and Quality Gauge
 */

import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import { CHART_COLORS, type AdvancedChartType } from './types'

/**
 * Props for AdvancedCharts component
 */
export interface AdvancedChartsProps {
  /** Type of advanced chart to render */
  type: AdvancedChartType
  /** Data for the chart */
  data: Record<string, unknown>[]
  /** Height of the chart */
  height?: number
  /** X-axis key for heatmap */
  xKey?: string
  /** Y-axis key for heatmap */
  yKey?: string
  /** Value key for all charts */
  valueKey?: string
  /** Name key for treemap */
  nameKey?: string
  /** Title for the chart */
  title?: string
  /** Additional className */
  className?: string
}

/**
 * Color scale for heatmap based on value
 */
const getHeatmapColor = (value: number, min: number, max: number): string => {
  const ratio = max === min ? 0.5 : (value - min) / (max - min)
  // Blue to Green to Yellow to Red
  if (ratio < 0.25) return `rgba(22, 105, 182, ${0.3 + ratio * 2})`
  if (ratio < 0.5) return `rgba(16, 185, 129, ${0.5 + (ratio - 0.25) * 2})`
  if (ratio < 0.75) return `rgba(245, 158, 11, ${0.5 + (ratio - 0.5) * 2})`
  return `rgba(239, 68, 68, ${0.7 + (ratio - 0.75)})`
}

/**
 * HeatmapChart - Grid-based visualization for temporal/categorical data
 */
function HeatmapChart({
  data,
  xKey = 'x',
  yKey = 'y',
  valueKey = 'value',
  height = 300,
}: {
  data: Record<string, unknown>[]
  xKey?: string
  yKey?: string
  valueKey?: string
  height?: number
}) {
  const { grid, xLabels, yLabels, min, max } = useMemo(() => {
    const xSet = new Set<string>()
    const ySet = new Set<string>()
    let minVal = Infinity
    let maxVal = -Infinity

    data.forEach((item) => {
      xSet.add(String(item[xKey]))
      ySet.add(String(item[yKey]))
      const val = Number(item[valueKey]) || 0
      minVal = Math.min(minVal, val)
      maxVal = Math.max(maxVal, val)
    })

    const xLabelsArr = Array.from(xSet).sort()
    const yLabelsArr = Array.from(ySet).sort()

    const gridMap: Record<string, Record<string, number>> = {}
    data.forEach((item) => {
      const x = String(item[xKey])
      const y = String(item[yKey])
      if (!gridMap[y]) gridMap[y] = {}
      gridMap[y][x] = Number(item[valueKey]) || 0
    })

    return {
      grid: gridMap,
      xLabels: xLabelsArr,
      yLabels: yLabelsArr,
      min: minVal === Infinity ? 0 : minVal,
      max: maxVal === -Infinity ? 0 : maxVal,
    }
  }, [data, xKey, yKey, valueKey])

  const cellWidth = Math.max(40, Math.floor(600 / xLabels.length))
  const cellHeight = Math.max(30, Math.floor(height / (yLabels.length + 1)))

  return (
    <div className="overflow-auto">
      <svg
        width={xLabels.length * cellWidth + 80}
        height={yLabels.length * cellHeight + 40}
        className="font-sans"
      >
        {/* X-axis labels */}
        {xLabels.map((label, i) => (
          <text
            key={`x-${label}`}
            x={80 + i * cellWidth + cellWidth / 2}
            y={20}
            textAnchor="middle"
            className="text-xs fill-gray-500 dark:fill-gray-400"
          >
            {label.length > 8 ? label.slice(0, 8) + '...' : label}
          </text>
        ))}

        {/* Y-axis labels and cells */}
        {yLabels.map((yLabel, yi) => (
          <g key={`row-${yLabel}`}>
            <text
              x={75}
              y={40 + yi * cellHeight + cellHeight / 2}
              textAnchor="end"
              dominantBaseline="middle"
              className="text-xs fill-gray-500 dark:fill-gray-400"
            >
              {yLabel.length > 10 ? yLabel.slice(0, 10) + '...' : yLabel}
            </text>
            {xLabels.map((xLabel, xi) => {
              const value = grid[yLabel]?.[xLabel] || 0
              return (
                <g key={`cell-${yi}-${xi}`}>
                  <rect
                    x={80 + xi * cellWidth}
                    y={30 + yi * cellHeight}
                    width={cellWidth - 2}
                    height={cellHeight - 2}
                    fill={getHeatmapColor(value, min, max)}
                    rx={4}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <title>{`${xLabel}, ${yLabel}: ${value.toLocaleString('pt-BR')}`}</title>
                  </rect>
                  <text
                    x={80 + xi * cellWidth + cellWidth / 2}
                    y={30 + yi * cellHeight + cellHeight / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs fill-white font-medium pointer-events-none"
                  >
                    {value > 0 ? value.toLocaleString('pt-BR') : ''}
                  </text>
                </g>
              )
            })}
          </g>
        ))}
      </svg>
    </div>
  )
}

/**
 * TreemapChart - Hierarchical data visualization
 */
function TreemapChart({
  data,
  nameKey = 'name',
  valueKey = 'value',
  height = 300,
}: {
  data: Record<string, unknown>[]
  nameKey?: string
  valueKey?: string
  height?: number
}) {
  const treemapData = useMemo(() => {
    return data.map((item, index) => ({
      name: String(item[nameKey] || `Item ${index + 1}`),
      size: Number(item[valueKey]) || 0,
    }))
  }, [data, nameKey, valueKey])

  const CustomContent = (props: {
    x?: number
    y?: number
    width?: number
    height?: number
    name?: string
    size?: number
    index?: number
  }) => {
    const { x = 0, y = 0, width = 0, height: h = 0, name = '', size = 0, index = 0 } = props
    const showLabel = width > 60 && h > 30

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={h}
          fill={CHART_COLORS[index % CHART_COLORS.length]}
          stroke="#fff"
          strokeWidth={2}
          rx={4}
          className="hover:opacity-80 transition-opacity cursor-pointer"
        />
        {showLabel && (
          <>
            <text
              x={x + width / 2}
              y={y + h / 2 - 8}
              textAnchor="middle"
              className="text-xs fill-white font-medium pointer-events-none"
            >
              {name.length > 15 ? name.slice(0, 15) + '...' : name}
            </text>
            <text
              x={x + width / 2}
              y={y + h / 2 + 8}
              textAnchor="middle"
              className="text-xs fill-white/80 pointer-events-none"
            >
              {size.toLocaleString('pt-BR')}
            </text>
          </>
        )}
      </g>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Treemap
        data={treemapData}
        dataKey="size"
        aspectRatio={4 / 3}
        stroke="#fff"
        content={<CustomContent />}
      >
        <Tooltip
          formatter={(value) => [
            typeof value === 'number' ? value.toLocaleString('pt-BR') : String(value),
            'Valor',
          ]}
          contentStyle={{
            backgroundColor: 'rgba(0,0,0,0.8)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
          }}
        />
      </Treemap>
    </ResponsiveContainer>
  )
}

/**
 * QualityGauge - Radial gauge for quality metrics (0-100%)
 */
function QualityGauge({
  value,
  title = 'Qualidade',
  height = 200,
}: {
  value: number
  title?: string
  height?: number
}) {
  const clampedValue = Math.max(0, Math.min(100, value))
  const angle = (clampedValue / 100) * 180

  // Determine color based on thresholds
  let color = '#ef4444' // Red < 60%
  if (clampedValue >= 80) color = '#10b981' // Green >= 80%
  else if (clampedValue >= 60) color = '#f59e0b' // Yellow 60-80%

  const size = Math.min(height, 200)
  const centerX = size / 2
  const centerY = size / 2 + 10
  const radius = size / 2 - 20

  // Calculate arc path
  const startAngle = 180
  const endAngle = 180 - angle
  const startRad = (startAngle * Math.PI) / 180
  const endRad = (endAngle * Math.PI) / 180

  const x1 = centerX + radius * Math.cos(startRad)
  const y1 = centerY - radius * Math.sin(startRad)
  const x2 = centerX + radius * Math.cos(endRad)
  const y2 = centerY - radius * Math.sin(endRad)

  const largeArcFlag = angle > 90 ? 1 : 0

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 40} viewBox={`0 0 ${size} ${size / 2 + 40}`}>
        {/* Background arc */}
        <path
          d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={12}
          strokeLinecap="round"
          className="dark:stroke-gray-700"
        />

        {/* Value arc */}
        {clampedValue > 0 && (
          <path
            d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`}
            fill="none"
            stroke={color}
            strokeWidth={12}
            strokeLinecap="round"
          />
        )}

        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={centerX + (radius - 15) * Math.cos(endRad)}
          y2={centerY - (radius - 15) * Math.sin(endRad)}
          stroke="#374151"
          strokeWidth={3}
          strokeLinecap="round"
          className="dark:stroke-gray-300"
        />
        <circle cx={centerX} cy={centerY} r={6} fill="#374151" className="dark:fill-gray-300" />

        {/* Labels */}
        <text x={centerX - radius - 5} y={centerY + 15} className="text-xs fill-gray-500">
          0%
        </text>
        <text x={centerX + radius - 15} y={centerY + 15} className="text-xs fill-gray-500">
          100%
        </text>

        {/* Value */}
        <text
          x={centerX}
          y={centerY + 35}
          textAnchor="middle"
          className="text-2xl font-bold"
          fill={color}
        >
          {clampedValue.toFixed(1)}%
        </text>
      </svg>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{title}</p>
    </div>
  )
}

/**
 * AdvancedCharts Component
 * Renders advanced chart types based on the type prop
 */
export function AdvancedCharts({
  type,
  data,
  height = 300,
  xKey = 'x',
  yKey = 'y',
  valueKey = 'value',
  nameKey = 'name',
  title,
  className,
}: AdvancedChartsProps) {
  // For gauge, extract value from first data item
  const gaugeValue = useMemo(() => {
    if (type !== 'gauge' || !data.length) return 0
    const firstItem = data[0]
    return Number(firstItem[valueKey]) || Number(firstItem.value) || 0
  }, [type, data, valueKey])

  return (
    <div className={cn('w-full', className)}>
      {title && (
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">{title}</h3>
      )}

      {type === 'heatmap' && (
        <HeatmapChart data={data} xKey={xKey} yKey={yKey} valueKey={valueKey} height={height} />
      )}

      {type === 'treemap' && (
        <TreemapChart data={data} nameKey={nameKey} valueKey={valueKey} height={height} />
      )}

      {type === 'gauge' && <QualityGauge value={gaugeValue} title={title} height={height} />}
    </div>
  )
}

export default AdvancedCharts
