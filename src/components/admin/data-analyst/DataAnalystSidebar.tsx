import React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lightbulb,
  Info
} from 'lucide-react'
import { InsightCards } from './InsightCards'
import { SmartSuggestions } from './SmartSuggestions'

export interface DataAnalystSidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  analyticsPeriod: '7d' | '30d' | 'this_month'
  setAnalyticsPeriod: (period: '7d' | '30d' | 'this_month') => void
  onQuerySubmit: (query: string) => void
  className?: string
}

export function DataAnalystSidebar({
  isCollapsed,
  onToggleCollapse,
  analyticsPeriod,
  setAnalyticsPeriod,
  onQuerySubmit,
  className
}: DataAnalystSidebarProps) {

  return (
    <div
      className={cn(
        'transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 z-30',
        isCollapsed ? 'w-12' : 'w-80',
        className
      )}
    >
      <Card className="h-full flex flex-col glass glass-dark border-0 relative bg-gray-50/80 dark:bg-gray-900/90 backdrop-blur-xl border-l border-white/20">
        {/* Collapse Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className={cn(
            'absolute top-3 z-20 p-1.5 h-8 w-8 rounded-full',
            'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm',
            'border border-gray-200/50 dark:border-gray-700/50',
            'shadow-sm hover:shadow-md',
            isCollapsed ? 'right-2' : 'right-3'
          )}
          aria-label={isCollapsed ? 'Expandir' : 'Recolher'}
        >
          {isCollapsed ? (
            <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          )}
        </Button>

        {/* Collapsed State */}
        {isCollapsed ? (
          <div className="flex flex-col items-center pt-14 pb-4 space-y-4">
             <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10">
               <Sparkles className="h-5 w-5 text-amber-500 dark:text-amber-400" />
             </div>
             <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
               <Info className="h-5 w-5 text-blue-500 dark:text-blue-400" />
             </div>
             <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
               <Lightbulb className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
             </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <CardHeader className="border-b border-gray-200/50 dark:border-white/10 pb-3 pt-3 pr-12 flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                  <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                </div>
                <span className="text-gray-900 dark:text-gray-100">
                  Sugestões e Insights
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
               
               {/* Period Filter */}
               <div>
                 <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                   Período de Análise
                 </h4>
                 <div className="flex bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl">
                   {(['7d', '30d', 'this_month'] as const).map((p) => (
                     <button
                       key={p}
                       onClick={() => setAnalyticsPeriod(p)}
                       className={cn(
                         'flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                         analyticsPeriod === p
                           ? 'bg-virtualis-blue-600 text-white shadow-sm'
                           : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
                       )}
                     >
                       {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : 'Este mês'}
                     </button>
                   ))}
                 </div>
               </div>

               {/* Insights Section */}
               <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Insights Rápidos
                    </h4>
                  </div>
                  <InsightCards
                    period={analyticsPeriod === 'this_month' ? '30d' : analyticsPeriod}
                    onActionClick={onQuerySubmit}
                    className="grid-cols-1"
                  />
               </div>

               {/* Suggestions Section */}
               <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Lightbulb className="h-3.5 w-3.5" />
                    Sugestões de Perguntas
                  </h4>
                  <SmartSuggestions
                    onSuggestionClick={onQuerySubmit}
                    period={analyticsPeriod}
                  />
               </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
