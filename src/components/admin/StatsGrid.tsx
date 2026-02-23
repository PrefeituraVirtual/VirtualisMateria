import React from 'react'
import { StatsCard, StatsCardProps } from './StatsCard'
import { cn } from '@/lib/utils'
import { BarChart3 } from 'lucide-react'

export interface StatsGridProps {
  /** Array of stats to display */
  stats: Omit<StatsCardProps, 'loading'>[]
  /** Loading state for all cards */
  loading?: boolean
  /** Additional className */
  className?: string
}

/**
 * StatsGrid Component
 * Grid layout for displaying multiple StatsCard components
 * Responsive: 1 column on mobile, 2 on tablet, 4 on desktop
 */
export function StatsGrid({ stats, loading = false, className }: StatsGridProps) {
  // If loading, show 4 skeleton cards
  if (loading) {
    return (
      <div
        className={cn(
          'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
          className
        )}
      >
        {[1, 2, 3, 4].map((i) => (
          <StatsCard
            key={i}
            label=""
            value=""
            icon={BarChart3}
            loading={true}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
        className
      )}
    >
      {stats.map((stat, index) => (
        <StatsCard key={index} {...stat} />
      ))}
    </div>
  )
}
