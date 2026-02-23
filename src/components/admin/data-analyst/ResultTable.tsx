import React, { useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
} from 'lucide-react'
import type { ColumnMetadata } from './types'

/**
 * Props for ResultTable component
 */
export interface ResultTableProps {
  /** Data rows to display */
  data: Record<string, unknown>[]
  /** Column metadata */
  columns: ColumnMetadata[]
  /** Loading state */
  loading?: boolean
  /** Page size for pagination */
  pageSize?: number
  /** Maximum height for scroll */
  maxHeight?: string
  /** Additional className */
  className?: string
  /** Previous period data for comparison */
  comparisonData?: Record<string, unknown>[]
  /** Label for comparison period */
  comparisonLabel?: string
  /** Whether comparison mode is enabled */
  showComparison?: boolean
  /** Callback when comparison toggle changes */
  onComparisonToggle?: (enabled: boolean) => void
  /** Server-side pagination: current page (1-indexed) */
  page?: number
  /** Server-side pagination: total number of rows */
  totalRows?: number
  /** Server-side pagination: total number of pages */
  totalPages?: number
  /** Server-side pagination: callback when page changes */
  onPageChange?: (page: number) => void
  /** Enable server-side pagination mode */
  serverSidePagination?: boolean
  /** Loading state for page change */
  pageLoading?: boolean
}

/**
 * Sort direction type
 */
type SortDirection = 'asc' | 'desc' | null

/**
 * Format cell value based on column type
 */
const formatCellValue = (value: unknown, column: ColumnMetadata): string => {
  if (value === null || value === undefined) return '-'

  switch (column.type) {
    case 'number':
      if (typeof value === 'number') {
        // Check if it looks like a currency or percentage
        if (column.format === 'currency') {
          return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(value)
        }
        if (column.format === 'percent') {
          return `${(value * 100).toFixed(1)}%`
        }
        return new Intl.NumberFormat('pt-BR').format(value)
      }
      if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
        return new Intl.NumberFormat('pt-BR').format(Number(value))
      }
      return String(value)

    case 'date':
      try {
        const date = value instanceof Date ? value : new Date(String(value))
        return new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(date)
      } catch {
        return String(value)
      }

    case 'boolean':
      if (typeof value === 'boolean') return value ? 'Sim' : 'Nao'
      return value ? 'Sim' : 'Nao'

    default:
      return String(value)
  }
}

/**
 * Calculate delta between current and previous values
 */
const calculateDelta = (
  current: unknown,
  previous: unknown
): { value: number; percentage: number; direction: 'up' | 'down' | 'neutral' } | null => {
  const currentNum = typeof current === 'number' ? current : Number(current)
  const previousNum = typeof previous === 'number' ? previous : Number(previous)

  if (isNaN(currentNum) || isNaN(previousNum)) return null

  const value = currentNum - previousNum
  const percentage = previousNum !== 0 ? (value / Math.abs(previousNum)) * 100 : 0
  const direction = value > 0 ? 'up' : value < 0 ? 'down' : 'neutral'

  return { value, percentage, direction }
}

/**
 * Format delta for display
 */
const formatDelta = (delta: { value: number; percentage: number; direction: 'up' | 'down' | 'neutral' }): string => {
  const sign = delta.direction === 'up' ? '+' : ''
  return `${sign}${delta.percentage.toFixed(1)}%`
}

/**
 * ResultTable Component
 * Data table with sorting, pagination, and virtual scrolling support
 */
export function ResultTable({
  data,
  columns,
  loading = false,
  pageSize = 10,
  maxHeight = '400px',
  className,
  comparisonData,
  comparisonLabel = 'Periodo anterior',
  showComparison = false,
  onComparisonToggle,
  page: serverPage,
  totalRows: serverTotalRows,
  totalPages: serverTotalPages,
  onPageChange,
  serverSidePagination = false,
  pageLoading = false,
}: ResultTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  // Sync internal page state with server page when using server-side pagination
  React.useEffect(() => {
    if (serverSidePagination && serverPage !== undefined) {
      setCurrentPage(serverPage)
    }
  }, [serverSidePagination, serverPage])

  /**
   * Calculate total pages (client-side or server-side)
   */
  const totalPages = useMemo(() => {
    if (serverSidePagination && serverTotalPages !== undefined) {
      return serverTotalPages
    }
    return Math.ceil(data.length / pageSize)
  }, [serverSidePagination, serverTotalPages, data.length, pageSize])

  /**
   * Total row count for display (client-side or server-side)
   */
  const totalRowCount = useMemo(() => {
    if (serverSidePagination && serverTotalRows !== undefined) {
      return serverTotalRows
    }
    return data.length
  }, [serverSidePagination, serverTotalRows, data.length])

  /**
   * Handle page change - server-side or client-side
   */
  const handlePageChange = useCallback((newPage: number) => {
    if (serverSidePagination && onPageChange) {
      onPageChange(newPage)
    } else {
      setCurrentPage(newPage)
    }
  }, [serverSidePagination, onPageChange])

  /**
   * Sort data (only for client-side pagination)
   */
  const sortedData = useMemo(() => {
    // For server-side pagination, sorting should be done on server
    // but we still allow local sorting of the current page data
    if (!sortColumn || !sortDirection) return data

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn]
      const bValue = b[sortColumn]

      // Handle null/undefined
      if (aValue === null || aValue === undefined) return sortDirection === 'asc' ? -1 : 1
      if (bValue === null || bValue === undefined) return sortDirection === 'asc' ? 1 : -1

      // Compare based on type
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }

      // String comparison
      const aStr = String(aValue).toLowerCase()
      const bStr = String(bValue).toLowerCase()
      return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    })
  }, [data, sortColumn, sortDirection])

  /**
   * Paginate data
   * For server-side pagination, data is already paginated, just sort locally
   * For client-side pagination, slice the data
   */
  const paginatedData = useMemo(() => {
    if (serverSidePagination) {
      // Server-side: data is already the page slice, just return sorted
      return sortedData
    }
    // Client-side: slice the sorted data
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [serverSidePagination, sortedData, currentPage, pageSize])

  /**
   * Handle column header click for sorting
   */
  const handleSort = useCallback((columnName: string) => {
    setSortColumn((prev) => {
      if (prev !== columnName) {
        setSortDirection('asc')
        return columnName
      }
      return prev
    })

    if (sortColumn === columnName) {
      setSortDirection((prev) => {
        if (prev === 'asc') return 'desc'
        if (prev === 'desc') return null
        return 'asc'
      })
      if (sortDirection === 'desc') setSortColumn(null)
    }
  }, [sortColumn, sortDirection])

  /**
   * Get sort icon for column
   */
  const getSortIcon = (columnName: string) => {
    if (sortColumn !== columnName) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />
    }
    if (sortDirection === 'asc') {
      return <ChevronUp className="h-4 w-4 text-virtualis-blue-500" />
    }
    if (sortDirection === 'desc') {
      return <ChevronDown className="h-4 w-4 text-virtualis-blue-500" />
    }
    return <ArrowUpDown className="h-4 w-4 text-gray-400" />
  }

  /**
   * Render loading skeleton
   */
  if (loading) {
    return (
      <div className={cn('rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden', className)}>
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
              ))}
            </div>
          </div>
          {/* Row skeletons */}
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex gap-4">
                {[1, 2, 3, 4].map((col) => (
                  <div key={col} className="h-4 bg-gray-100 dark:bg-gray-800 rounded flex-1" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  /**
   * Render empty state
   */
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div
        className={cn(
          'rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-8',
          'flex items-center justify-center text-gray-500 dark:text-gray-400',
          className
        )}
      >
        Nenhum dado disponível
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Table container with scroll */}
      <div
        className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        style={{ maxHeight }}
      >
        <div className="overflow-auto" style={{ maxHeight }}>
          {/* Comparison toggle */}
          {comparisonData && comparisonData.length > 0 && onComparisonToggle && (
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Comparar com {comparisonLabel}
              </span>
              <button
                onClick={() => onComparisonToggle(!showComparison)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  showComparison ? 'bg-virtualis-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    showComparison ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          )}
          <table className="w-full">
            {/* Header */}
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.name}
                    className={cn(
                      'px-4 py-3 text-left text-sm font-semibold',
                      'text-gray-700 dark:text-gray-300',
                      'border-b border-gray-200 dark:border-gray-700',
                      'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700',
                      'transition-colors'
                    )}
                    onClick={() => handleSort(column.name)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{column.label}</span>
                      {getSortIcon(column.name)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="bg-white dark:bg-gray-900">
              {paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={cn(
                    'border-b border-gray-100 dark:border-gray-800',
                    'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                    'transition-colors'
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.name}
                      className={cn(
                        'px-4 py-3 text-sm',
                        'text-gray-700 dark:text-gray-300',
                        column.type === 'number' && 'text-right font-mono'
                      )}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <span>{formatCellValue(row[column.name], column)}</span>
                        {showComparison && comparisonData && column.type === 'number' && (
                          (() => {
                            const prevRow = comparisonData[rowIndex]
                            if (!prevRow) return null
                            const delta = calculateDelta(row[column.name], prevRow[column.name])
                            if (!delta) return null
                            return (
                              <span
                                className={cn(
                                  'text-xs font-medium px-1.5 py-0.5 rounded',
                                  delta.direction === 'up' && 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
                                  delta.direction === 'down' && 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
                                  delta.direction === 'neutral' && 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-700'
                                )}
                                title={`Valor anterior: ${formatCellValue(prevRow[column.name], column)}`}
                              >
                                {delta.direction === 'up' && '\u2191'}
                                {delta.direction === 'down' && '\u2193'}
                                {delta.direction === 'neutral' && '='}
                                {formatDelta(delta)}
                              </span>
                            )
                          })()
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          {/* Row info */}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {pageLoading ? (
              <span className="animate-pulse">Carregando...</span>
            ) : (
              <>
                Mostrando {(currentPage - 1) * pageSize + 1} a{' '}
                {Math.min(currentPage * pageSize, totalRowCount)} de {totalRowCount} resultados
              </>
            )}
          </p>

          {/* Page controls */}
          <div className="flex items-center gap-1">
            {/* First page */}
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1 || pageLoading}
              className={cn(
                'p-2 rounded-lg transition-colors',
                currentPage === 1 || pageLoading
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
              aria-label="Primeira pagina"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>

            {/* Previous page */}
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || pageLoading}
              className={cn(
                'p-2 rounded-lg transition-colors',
                currentPage === 1 || pageLoading
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
              aria-label="Pagina anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1 px-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    disabled={pageLoading}
                    className={cn(
                      'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                      currentPage === pageNum
                        ? 'bg-virtualis-blue-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
                      pageLoading && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            {/* Next page */}
            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || pageLoading}
              className={cn(
                'p-2 rounded-lg transition-colors',
                currentPage === totalPages
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
              aria-label="Proxima pagina"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Last page */}
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages || pageLoading}
              className={cn(
                'p-2 rounded-lg transition-colors',
                currentPage === totalPages || pageLoading
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
              aria-label="Ultima pagina"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
