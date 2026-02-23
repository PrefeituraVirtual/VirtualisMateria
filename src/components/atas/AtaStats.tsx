import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  FileText, CheckCircle, CalendarDays, Calendar, BarChart3, PieChart, TrendingUp, Circle
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AtaStatsType, SESSION_TYPES, ATA_STATUSES } from '@/types/ata'

// Map of icon names for dynamic lookups
const iconMap: Record<string, LucideIcon> = {
  FileText, CheckCircle, CalendarDays, Calendar, Circle
}

interface AtaStatsProps {
  stats: AtaStatsType | null
  isLoading: boolean
}

/**
 * AtaStats Component
 *
 * Displays statistics about atas including:
 * - Total count
 * - Breakdown by status
 * - Breakdown by session type
 * - This month/year counts
 * - Average metrics
 */
export function AtaStats({ stats, isLoading }: AtaStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-4">
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName]
    return Icon ? <Icon className="h-5 w-5" /> : null
  }

  // Get approved count for display
  const approvedCount = stats.byStatus?.find(s => s.status === 'APR')?.count || 0
  // Get this year count
  const currentYear = new Date().getFullYear()
  const thisYearCount = stats.byYear?.find(y => y.year === currentYear)?.count || 0
  // Get ordinary sessions count
  const ordinaryCount = stats.bySessionType?.find(t => t.type === 'SO')?.count || 0

  const statCards = [
    {
      title: 'Total de Atas',
      value: stats.total,
      icon: 'FileText',
      color: 'bg-virtualis-blue-100 dark:bg-virtualis-blue-900/30 text-virtualis-blue-600 dark:text-virtualis-blue-400',
      borderColor: 'border-virtualis-blue-200 dark:border-virtualis-blue-800'
    },
    {
      title: 'Aprovadas',
      value: approvedCount,
      icon: 'CheckCircle',
      color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      borderColor: 'border-green-200 dark:border-green-800'
    },
    {
      title: 'Este Ano',
      value: thisYearCount,
      icon: 'CalendarDays',
      color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      borderColor: 'border-purple-200 dark:border-purple-800'
    },
    {
      title: 'Sessões Ordinárias',
      value: ordinaryCount,
      icon: 'Calendar',
      color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
      borderColor: 'border-cyan-200 dark:border-cyan-800'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className={cn('glass glass-dark border-0 border-l-4', stat.borderColor)}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', stat.color)}>
                  {getIcon(stat.icon)}
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status and Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By Status */}
        <Card className="glass glass-dark border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-gray-500" />
              Por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(stats.byStatus || []).map((item) => {
                const config = ATA_STATUSES[item.status]
                const percentage = stats.total > 0 ? (item.count / stats.total) * 100 : 0

                return (
                  <div key={item.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        {getIcon(config?.icon || 'Circle')}
                        {config?.label || item.status}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.count}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={cn(
                          'h-2 rounded-full transition-all duration-500',
                          item.status === 'APR' ? 'bg-green-500' :
                          item.status === 'EV' ? 'bg-yellow-500' :
                          item.status === 'AGLV' ? 'bg-orange-500' :
                          item.status === 'CAD' ? 'bg-gray-400' :
                          'bg-gray-500'
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* By Type */}
        <Card className="glass glass-dark border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4 text-gray-500" />
              Por Tipo de Sessão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(stats.bySessionType || []).map((item) => {
                const config = SESSION_TYPES[item.type]
                const percentage = stats.total > 0 ? (item.count / stats.total) * 100 : 0

                return (
                  <div key={item.type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        {getIcon(config?.icon || 'Calendar')}
                        {config?.label || item.type}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.count}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={cn(
                          'h-2 rounded-full transition-all duration-500',
                          item.type === 'SO' ? 'bg-blue-500' :
                          item.type === 'SX' ? 'bg-orange-500' :
                          'bg-gray-500'
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By Year */}
      {stats.byYear && stats.byYear.length > 0 && (
        <Card className="glass glass-dark border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              Por Ano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {stats.byYear.map((item) => (
                <div key={item.year} className="flex flex-col items-center min-w-[60px]">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {item.count}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {item.year}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AtaStats
