/**
 * ChartTypeSelector Component
 * Allows dynamic switching between chart visualization types
 */

import React from 'react'
import { cn } from '@/lib/utils'
import {
  LineChart,
  BarChart3,
  PieChart,
  AreaChart,
  Grid3x3,
  TreePine,
  Gauge,
} from 'lucide-react'
import type { ChartType, BasicChartType, AdvancedChartType } from './types'

/**
 * Props for ChartTypeSelector component
 */
export interface ChartTypeSelectorProps {
  /** Currently selected chart type */
  currentType: ChartType
  /** Available chart types to show */
  availableTypes: ChartType[]
  /** Callback when type changes */
  onTypeChange: (type: ChartType) => void
  /** Whether selector is disabled */
  disabled?: boolean
  /** Show labels alongside icons */
  showLabels?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional className */
  className?: string
}

/**
 * Chart type configuration with icon and label
 */
const CHART_TYPE_CONFIG: Record<
  ChartType,
  {
    icon: React.ComponentType<{ className?: string }>
    label: string
    description: string
  }
> = {
  line: {
    icon: LineChart,
    label: 'Linha',
    description: 'Grafico de linha para tendencias',
  },
  bar: {
    icon: BarChart3,
    label: 'Barras',
    description: 'Grafico de barras para comparacoes',
  },
  pie: {
    icon: PieChart,
    label: 'Pizza',
    description: 'Grafico de pizza para proporcoes',
  },
  area: {
    icon: AreaChart,
    label: 'Area',
    description: 'Grafico de area para volumes',
  },
  heatmap: {
    icon: Grid3x3,
    label: 'Mapa de Calor',
    description: 'Heatmap para dados matriciais',
  },
  treemap: {
    icon: TreePine,
    label: 'Treemap',
    description: 'Treemap para hierarquias',
  },
  gauge: {
    icon: Gauge,
    label: 'Gauge',
    description: 'Medidor para metricas',
  },
}

/**
 * Size configurations
 */
const SIZE_CONFIG = {
  sm: {
    button: 'p-1.5',
    icon: 'h-3.5 w-3.5',
    label: 'text-xs',
  },
  md: {
    button: 'p-2',
    icon: 'h-4 w-4',
    label: 'text-sm',
  },
  lg: {
    button: 'p-2.5',
    icon: 'h-5 w-5',
    label: 'text-sm',
  },
}

/**
 * Check if a chart type is a basic type
 */
export function isBasicChartType(type: ChartType): type is BasicChartType {
  return ['line', 'bar', 'pie', 'area'].includes(type)
}

/**
 * Check if a chart type is an advanced type
 */
export function isAdvancedChartType(type: ChartType): type is AdvancedChartType {
  return ['heatmap', 'treemap', 'gauge'].includes(type)
}

/**
 * ChartTypeSelector Component
 * Grid of buttons for selecting chart visualization type
 */
export function ChartTypeSelector({
  currentType,
  availableTypes,
  onTypeChange,
  disabled = false,
  showLabels = false,
  size = 'md',
  className,
}: ChartTypeSelectorProps) {
  const sizeConfig = SIZE_CONFIG[size]

  // Group types into basic and advanced
  const basicTypes = availableTypes.filter(isBasicChartType)
  const advancedTypes = availableTypes.filter(isAdvancedChartType)

  const renderButton = (type: ChartType) => {
    const config = CHART_TYPE_CONFIG[type]
    const Icon = config.icon
    const isSelected = currentType === type

    return (
      <button
        key={type}
        onClick={() => onTypeChange(type)}
        disabled={disabled}
        title={config.description}
        className={cn(
          'flex items-center gap-1.5 rounded-md transition-all',
          sizeConfig.button,
          isSelected
            ? 'bg-virtualis-blue-600 text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Icon className={sizeConfig.icon} />
        {showLabels && <span className={sizeConfig.label}>{config.label}</span>}
      </button>
    )
  }

  return (
    <div className={cn('flex items-center', className)}>
      {/* Basic chart types */}
      {basicTypes.length > 0 && (
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          {basicTypes.map(renderButton)}
        </div>
      )}

      {/* Separator if both groups exist */}
      {basicTypes.length > 0 && advancedTypes.length > 0 && (
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
      )}

      {/* Advanced chart types */}
      {advancedTypes.length > 0 && (
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          {advancedTypes.map(renderButton)}
        </div>
      )}
    </div>
  )
}

export default ChartTypeSelector
