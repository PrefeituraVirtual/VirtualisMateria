import React from 'react'
import { cn } from '@/lib/utils'
import { User, MessageSquare, Zap, Crown } from 'lucide-react'

export interface TopUser {
  /** User ID */
  id: string | number
  /** User name */
  name: string
  /** User email */
  email?: string
  /** Avatar URL */
  avatar?: string
  /** Total conversations */
  conversations: number
  /** Total messages */
  messages: number
  /** Total tokens used */
  tokens?: number
  /** Last active date */
  lastActive?: string
}

export interface TopUsersTableProps {
  /** Array of top users */
  users: TopUser[]
  /** Loading state */
  loading?: boolean
  /** Additional className */
  className?: string
}

/**
 * TopUsersTable Component
 * Displays a table of most active users with their statistics
 */
export function TopUsersTable({ users, loading = false, className }: TopUsersTableProps) {
  if (loading) {
    return (
      <div
        className={cn(
          'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden',
          className
        )}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                  <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Format number to compact form
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  // Get rank badge
  const getRankBadge = (index: number) => {
    if (index === 0) {
      return (
        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-900/30">
          <Crown className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        </div>
      )
    }
    return (
      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-800">
        <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
          {index + 1}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b-0 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-virtualis-gold-500/50 after:to-transparent">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Usuarios Mais Ativos
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ranking por numero de conversas
        </p>
      </div>

      {/* Table */}
      {users.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          Nenhum usuario encontrado
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {users.map((user, index) => (
            <div
              key={user.id}
              className="p-4 border-b-0 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-virtualis-gold-500/50 after:to-transparent last:after:hidden hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                {getRankBadge(index)}

                {/* Avatar */}
                <div className="flex-shrink-0">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  )}
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {user.name}
                  </p>
                  {user.email && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                  <div
                    className="flex items-center gap-1 text-gray-600 dark:text-gray-400"
                    title="Conversas"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="font-medium">{formatNumber(user.conversations)}</span>
                  </div>
                  {user.tokens !== undefined && (
                    <div
                      className="flex items-center gap-1 text-gray-600 dark:text-gray-400"
                      title="Tokens usados"
                    >
                      <Zap className="h-4 w-4" />
                      <span className="font-medium">{formatNumber(user.tokens)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
