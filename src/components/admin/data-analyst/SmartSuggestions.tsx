import React, { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Heart,
  AlertTriangle,
  Users,
  HelpCircle,
  Lightbulb,
  Loader2,
  Minus,
} from 'lucide-react'
import type { ContextualSuggestion, SuggestionsResponse } from './types'
import { DEFAULT_SUGGESTIONS } from './types'
import { adminDataAnalystService } from '@/lib/api'

/**
 * Icon mapping for suggestion categories
 */
const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Conversas: MessageSquare,
  Sentimento: Heart,
  Performance: TrendingUp,
  Usuarios: Users,
  MessageSquare,
  Heart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  HelpCircle,
}

/**
 * Category colors mapping
 */
const CATEGORY_COLORS: Record<string, string> = {
  Conversas: 'bg-blue-50 text-blue-700 border-blue-200',
  Sentimento: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Performance: 'bg-amber-50 text-amber-700 border-amber-200',
  Usuarios: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

/**
 * Priority badge styles
 */
const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  medium: 'bg-blue-100 text-blue-700 border-blue-300',
  low: 'bg-gray-100 text-gray-600 border-gray-300',
}

/**
 * Props for SmartSuggestions component
 */
export interface SmartSuggestionsProps {
  /** Callback when a suggestion is clicked */
  onSuggestionClick: (query: string) => void
  /** Period filter for suggestions */
  period?: '7d' | '30d' | 'this_month'
  /** Additional className */
  className?: string
}

/**
 * SmartSuggestions Component
 * Displays contextual suggestions grouped by category with metrics and priority indicators
 */
export function SmartSuggestions({
  onSuggestionClick,
  period = '7d',
  className,
}: SmartSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ContextualSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load suggestions from API
   */
  const loadSuggestions = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await adminDataAnalystService.getSuggestions({ period })
      const data = response as SuggestionsResponse

      if (data?.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions)
      } else {
        // Fallback to default suggestions with contextual enhancement
        setSuggestions(
          DEFAULT_SUGGESTIONS.map((s) => ({
            ...s,
            query: s.text,
            priority: 'medium' as const,
          }))
        )
      }
    } catch (err) {
      console.error('Error loading suggestions:', err)
      setError('Erro ao carregar sugestoes')
      // Fallback to default suggestions
      setSuggestions(
        DEFAULT_SUGGESTIONS.map((s) => ({
          ...s,
          query: s.text,
          priority: 'medium' as const,
        }))
      )
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    loadSuggestions()
  }, [loadSuggestions])

  /**
   * Group suggestions by category
   */
  const groupedSuggestions = suggestions.reduce<Record<string, ContextualSuggestion[]>>(
    (acc, suggestion) => {
      const category = suggestion.category || 'geral'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(suggestion)
      return acc
    },
    {}
  )

  /**
   * Get icon component for a suggestion
   */
  const getIcon = (suggestion: ContextualSuggestion) => {
    // Try icon name first, then category
    const iconName = suggestion.icon || suggestion.category
    const IconComponent = CATEGORY_ICON_MAP[iconName]
    return IconComponent ? <IconComponent className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />
  }

  /**
   * Get trend icon for metric
   */
  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-emerald-500" />
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" />
      case 'stable':
        return <Minus className="h-3 w-3 text-gray-400" />
      default:
        return null
    }
  }

  /**
   * Handle suggestion click
   */
  const handleClick = (suggestion: ContextualSuggestion) => {
    const query = suggestion.query || suggestion.text
    onSuggestionClick(query)
  }

  /**
   * Loading skeleton
   */
  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Carregando sugestoes...</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="flex flex-wrap gap-2">
                {[1, 2].map((j) => (
                  <div
                    key={j}
                    className="h-10 w-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Lightbulb className="h-4 w-4" />
        <span>Sugestoes contextuais</span>
        {error && <span className="text-red-500 text-xs">({error})</span>}
      </div>

      {/* Grouped Suggestions */}
      <div className="space-y-4">
        {Object.entries(groupedSuggestions).map(([category, categorySuggestions]) => (
          <div key={category} className="space-y-2">
            {/* Category Label */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded-full border',
                  CATEGORY_COLORS[category] || 'bg-gray-50 text-gray-600 border-gray-200'
                )}
              >
                {category}
              </span>
            </div>

            {/* Suggestions */}
            <div className="flex flex-wrap gap-2">
              {categorySuggestions.map((suggestion, index) => (
                <button
                  key={`${category}-${index}`}
                  onClick={() => handleClick(suggestion)}
                  className={cn(
                    'group flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                    'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700',
                    'text-gray-700 dark:text-gray-300',
                    'hover:bg-gray-50 dark:hover:bg-gray-800',
                    'hover:border-virtualis-blue-300 dark:hover:border-virtualis-blue-600',
                    'transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-virtualis-blue-500/20 focus:border-virtualis-blue-500',
                    suggestion.priority === 'high' && 'border-l-2 border-l-orange-400'
                  )}
                >
                  {/* Icon */}
                  <span className="text-gray-400 dark:text-gray-500 group-hover:text-virtualis-blue-500 transition-colors">
                    {getIcon(suggestion)}
                  </span>

                  {/* Text */}
                  <span className="max-w-xs truncate">{suggestion.text}</span>

                  {/* Metric */}
                  {suggestion.metric && (
                    <span className="flex items-center gap-1 ml-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">{suggestion.metric.value}</span>
                      {getTrendIcon(suggestion.metric.trend)}
                    </span>
                  )}

                  {/* Priority Badge */}
                  {suggestion.priority === 'high' && (
                    <span
                      className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded border',
                        PRIORITY_STYLES.high
                      )}
                    >
                      Importante
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {Object.keys(groupedSuggestions).length === 0 && !loading && (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          <p className="text-sm">Nenhuma sugestao disponivel no momento.</p>
        </div>
      )}
    </div>
  )
}
