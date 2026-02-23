import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, HelpCircle,  Trophy, Medal } from 'lucide-react'
import type { TopQuestion } from './types'
import { CATEGORY_COLORS } from './types'

/**
 * Props for TopQuestionsChart component
 */
export interface TopQuestionsChartProps {
  /** Array of top questions data */
  data: TopQuestion[]
  /** Loading state */
  loading?: boolean
  /** Additional className */
  className?: string
  /** Callback when a question is clicked */
  onQuestionClick?: (question: TopQuestion) => void
  /** Maximum number of questions to display */
  maxItems?: number
}

/**
 * Get trend icon component based on trend direction
 */
const getTrendIcon = (trend: TopQuestion['trend']) => {
  switch (trend) {
    case 'rising':
      return <TrendingUp className="h-4 w-4 text-green-500" />
    case 'declining':
      return <TrendingDown className="h-4 w-4 text-red-500" />
    default:
      return <Minus className="h-4 w-4 text-gray-400" />
  }
}

/**
 * Get trend label in Portuguese
 */
const getTrendLabel = (trend: TopQuestion['trend']): string => {
  switch (trend) {
    case 'rising':
      return 'Em alta'
    case 'declining':
      return 'Em baixa'
    default:
      return 'Estável'
  }
}

/**
 * Get category color with fallback
 */
const getCategoryColor = (category: string): string => {
  const normalizedCategory = category.toLowerCase()
  return CATEGORY_COLORS[normalizedCategory] || CATEGORY_COLORS.outro || '#6b7280'
}

/**
 * Translate category to Portuguese
 */
const CATEGORY_LABELS: Record<string, string> = {
  'procedural_question': 'Consulta Procedimental',
  'status_inquiry': 'Consulta de Status',
  'document_request': 'Solicitação de Documento',
  'regimento_inquiry': 'Consulta Regimento',
  'member_inquiry': 'Consulta Vereador',
  'statistics_request': 'Estatísticas',
  'general_greeting': 'Saudação',
  'complaint_feedback': 'Reclamação/Feedback',
  'other': 'Outros',
  'legislativo': 'Legislativo',
  'tramitacao': 'Tramitação',
  'sessao': 'Sessão',
  'documento': 'Documento',
  'geral': 'Geral',
  'votacao': 'Votação',
}

const getCategoryLabel = (category: string): string => {
  return CATEGORY_LABELS[category.toLowerCase()] || CATEGORY_LABELS[category] || category
}

/**
 * TopQuestionsChart Component
 * Displays a list of top questions with a premium ranked design
 */
export function TopQuestionsChart({
  data,
  loading = false,
  className,
  onQuestionClick,
  maxItems = 10,
}: TopQuestionsChartProps) {
  /**
   * Process and sort data
   */
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return []

    // Sort by count and take top items
    const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, maxItems)

    return sorted.map((question, index) => ({
      ...question,
      rank: index + 1,
      color: getCategoryColor(question.category),
    }))
  }, [data, maxItems])

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
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
                <div className="flex-1">
                   <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                   <div className="h-3 w-1/4 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /**
   * Render empty state
   */
  if (!processedData.length) {
    return (
      <div
        className={cn(
          'p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900',
          className
        )}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <HelpCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Top Perguntas
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Perguntas mais frequentes dos usuários
            </p>
          </div>
        </div>
        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          Nenhuma pergunta registrada no período
        </div>
      </div>
    )
  }

  const getRankStyles = (rank: number) => {
    switch(rank) {
      case 1:
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900/30',
          text: 'text-yellow-700 dark:text-yellow-500', 
          border: 'border-yellow-200 dark:border-yellow-700',
          icon: <Trophy className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
        }
      case 2:
        return {
          bg: 'bg-slate-100 dark:bg-slate-800',
          text: 'text-slate-700 dark:text-slate-400',
          border: 'border-slate-200 dark:border-slate-700',
          icon: <Medal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        }
      case 3:
        return {
          bg: 'bg-orange-100 dark:bg-orange-900/30',
          text: 'text-orange-800 dark:text-orange-500',
          border: 'border-orange-200 dark:border-orange-800',
          icon: <Medal className="h-4 w-4 text-orange-600 dark:text-orange-500" />
        }
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-800',
          text: 'text-gray-600 dark:text-gray-400',
          border: 'border-transparent',
          icon: <span className="text-xs font-bold">{rank}</span>
        }
    }
  }

  return (
    <div
      className={cn(
        'p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-sm">
            <HelpCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Top Perguntas Frequentes
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Assuntos mais buscados pelos usuários
            </p>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="flex flex-col gap-3">
        {processedData.map((question) => {
          const rankStyles = getRankStyles(question.rank)
          const isTop3 = question.rank <= 3
          
          return (
            <div
              key={`${question.rank}-${question.question.slice(0, 20)}`}
              className={cn(
                'group relative flex items-center p-4 rounded-xl transition-all duration-200',
                'border border-gray-100 dark:border-gray-800/50', // Subtle border
                'hover:border-purple-200 dark:hover:border-purple-800/50', // Hover border
                'hover:shadow-md dark:hover:shadow-none dark:hover:bg-gray-800/50',
                isTop3 ? 'bg-gradient-to-r from-gray-50/50 to-white dark:from-gray-800/20 dark:to-gray-900' : 'bg-white dark:bg-gray-900'
              )}
              onClick={() => onQuestionClick?.(question)}
              role="button"
              tabIndex={0}
            >
              
              {/* Rank Column */}
              <div className="flex-shrink-0 mr-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border transition-transform group-hover:scale-110",
                  rankStyles.bg,
                  rankStyles.text,
                  rankStyles.border
                )}>
                  {rankStyles.icon}
                </div>
              </div>

              {/* Content Column */}
              <div className="flex-1 min-w-0 mr-4">
                 <div className="flex items-center gap-2 mb-1">
                    <span 
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: `${question.color}15`, // 15% opacity
                        color: question.color,
                        border: `1px solid ${question.color}30`
                      }}
                    >
                      {getCategoryLabel(question.category)}
                    </span>
                 </div>
                 <p className={cn(
                   "text-sm font-medium line-clamp-2 transition-colors",
                   isTop3 ? "text-gray-900 dark:text-gray-100 font-semibold" : "text-gray-700 dark:text-gray-300",
                   "group-hover:text-purple-600 dark:group-hover:text-purple-400"
                 )}>
                   {question.question}
                 </p>
              </div>

              {/* Stats Column */}
              <div className="flex flex-col items-end flex-shrink-0 min-w-[80px]">
                <div className="flex items-center gap-1.5">
                   <span className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                     {question.count} <span className="text-xs font-normal text-gray-500">buscas</span>
                   </span>
                   {getTrendIcon(question.trend)}
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {getTrendLabel(question.trend)}
                </span>
              </div>
              
              {/* Optional Heatmap/Highlight Bar on left edge for Top 3 */}
              {isTop3 && (
                <div 
                  className={cn(
                    "absolute left-0 top-3 bottom-3 w-1 rounded-r-full opacity-80", 
                    question.rank === 1 ? "bg-yellow-400" :
                    question.rank === 2 ? "bg-slate-400" :
                    "bg-orange-400"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-4">
         <span>Mostrando top {processedData.length} resultados</span>
         <span>Total: {processedData.reduce((sum, q) => sum + q.count, 0).toLocaleString('pt-BR')} buscas</span>
      </div>
    </div>
  )
}
