import React, { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  History,
  Search,
  Star,
  Trash2,
  Clock,
  Database,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { useDebouncedValue } from '@/hooks/useDebounce'
import type { QueryHistoryItem, QueryStatus } from './types'

/**
 * Props for QueryHistory component
 */
export interface QueryHistoryProps {
  /** List of query history items */
  items: QueryHistoryItem[]
  /** Currently selected item ID */
  selectedId?: string
  /** Loading state */
  loading?: boolean
  /** Callback when item is selected */
  onSelect: (item: QueryHistoryItem) => void
  /** Callback for favorite toggle */
  onFavoriteToggle?: (id: string, isFavorite: boolean) => void
  /** Callback for delete */
  onDelete?: (id: string) => void
  /** Additional className */
  className?: string
  /** Callback to load more items (lazy loading) */
  onLoadMore?: () => Promise<void>
  /** Whether there are more items to load */
  hasMore?: boolean
  /** Loading more items state */
  loadingMore?: boolean
}

/**
 * Status icon configuration
 */
const STATUS_CONFIG: Record<
  QueryStatus,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  pending: { icon: Clock, color: 'text-gray-400' },
  executing: { icon: Loader2, color: 'text-virtualis-blue-500' },
  completed: { icon: CheckCircle2, color: 'text-green-500' },
  error: { icon: AlertCircle, color: 'text-red-500' },
}

/**
 * Format relative time
 */
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Agora'
  if (diffMins < 60) return `${diffMins}m atras`
  if (diffHours < 24) return `${diffHours}h atras`
  if (diffDays < 7) return `${diffDays}d atras`

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

/**
 * QueryHistory Component
 * Sidebar showing query history with search, favorites, and delete
 */
export function QueryHistory({
  items,
  selectedId,
  loading = false,
  onSelect,
  onFavoriteToggle,
  onDelete,
  className,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
}: QueryHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  /**
   * Debounced search query for better performance
   */
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300)

  /**
   * Intersection Observer for lazy loading
   */
  useEffect(() => {
    if (!hasMore || loadingMore || !onLoadMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loadingMore, onLoadMore])

  /**
   * Filter items based on search and favorites filter
   */
  const filteredItems = items.filter((item) => {
    // Filter by favorites
    if (showFavoritesOnly && !item.isFavorite) return false

    // Filter by search using debounced value
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase()
      const preview = (item.responsePreview || '').toLowerCase()
      return (
        item.query.toLowerCase().includes(query) ||
        preview.includes(query)
      )
    }

    return true
  })

  /**
   * Handle item click
   */
  const handleItemClick = useCallback(
    (item: QueryHistoryItem) => {
      onSelect(item)
    },
    [onSelect]
  )

  /**
   * Handle favorite toggle
   */
  const handleFavoriteClick = useCallback(
    (e: React.MouseEvent, id: string, isFavorite: boolean) => {
      e.stopPropagation()
      onFavoriteToggle?.(id, !isFavorite)
    },
    [onFavoriteToggle]
  )

  /**
   * Handle delete
   */
  const handleDeleteClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      if (window.confirm('Tem certeza que deseja excluir esta consulta?')) {
        onDelete?.(id)
      }
    },
    [onDelete]
  )

  /**
   * Render loading skeleton
   */
  if (loading) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        {/* Header skeleton */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="animate-pulse space-y-3">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>

        {/* Items skeleton */}
        <div className="flex-1 p-4 space-y-3 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full bg-white dark:bg-gray-900', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Historico</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({filteredItems.length})
          </span>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar no historico..."
            className={cn(
              'w-full pl-10 pr-4 py-2 rounded-lg text-sm',
              'bg-gray-100 dark:bg-gray-800 border border-transparent',
              'text-gray-900 dark:text-gray-100 placeholder:text-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-virtualis-blue-500 focus:border-transparent'
            )}
          />
        </div>

        {/* Favorites filter */}
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors w-full',
            showFavoritesOnly
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          )}
        >
          <Star className={cn('h-4 w-4', showFavoritesOnly && 'fill-current')} />
          <span>Apenas favoritos</span>
        </button>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <History className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {searchQuery || showFavoritesOnly
                ? 'Nenhuma consulta encontrada'
                : 'Nenhuma consulta no historico'}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredItems.map((item) => {
              const { icon: StatusIcon, color: statusColor } = STATUS_CONFIG[item.status]
              const isSelected = selectedId === item.id
              const isExecuting = item.status === 'executing'
              const responsePreview = item.responsePreview || ''

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg transition-all',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    'border border-transparent',
                    isSelected && 'bg-virtualis-blue-50 dark:bg-virtualis-blue-900/20 border-virtualis-blue-200 dark:border-virtualis-blue-800'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Status icon */}
                    <StatusIcon
                      className={cn(
                        'h-4 w-4 mt-0.5 flex-shrink-0',
                        statusColor,
                        isExecuting && 'animate-spin'
                      )}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Query */}
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.query}
                      </p>

                      {/* Response preview */}
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                        {responsePreview}
                      </p>

                      {/* Metadata */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
                        <span className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          {item.rowCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-center gap-1">
                      {/* Favorite */}
                      {onFavoriteToggle && (
                        <button
                          onClick={(e) => handleFavoriteClick(e, item.id, item.isFavorite)}
                          className={cn(
                            'p-1 rounded transition-colors',
                            item.isFavorite
                              ? 'text-amber-500'
                              : 'text-gray-300 dark:text-gray-600 hover:text-amber-500'
                          )}
                          aria-label={item.isFavorite ? 'Remover favorito' : 'Favoritar'}
                        >
                          <Star className={cn('h-4 w-4', item.isFavorite && 'fill-current')} />
                        </button>
                      )}

                      {/* Delete */}
                      {onDelete && (
                        <button
                          onClick={(e) => handleDeleteClick(e, item.id)}
                          className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors"
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}

                      {/* Arrow indicator for selected */}
                      {isSelected && (
                        <ChevronRight className="h-4 w-4 text-virtualis-blue-500 mt-1" />
                      )}
                    </div>
                  </div>
                </button>
              )
            })}

            {/* Sentinel element for Intersection Observer (lazy loading) */}
            <div ref={sentinelRef} className="h-4" aria-hidden="true" />

            {/* Loading more indicator */}
            {loadingMore && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
