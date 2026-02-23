import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Search, Calendar, Filter, X, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export interface ConversationFiltersState {
  /** Search term for keyword search */
  search: string
  /** User ID filter */
  userId: string
  /** Start date for date range filter */
  dateFrom: string
  /** End date for date range filter */
  dateTo: string
}

export interface ConversationFiltersProps {
  /** Current filter values */
  filters: ConversationFiltersState
  /** Callback when filters change */
  onFiltersChange: (filters: ConversationFiltersState) => void
  /** Callback when export is requested */
  onExport: (format: 'csv' | 'json') => void
  /** Loading state for export */
  exportLoading?: boolean
  /** Additional className */
  className?: string
}

/**
 * ConversationFilters Component
 * Filter controls for the conversation audit page
 * Includes search, date range, user filter, and export options
 */
export function ConversationFilters({
  filters,
  onFiltersChange,
  onExport,
  exportLoading = false,
  className,
}: ConversationFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Handle filter changes
  const handleChange = (key: keyof ConversationFiltersState, value: string) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  // Clear all filters
  const handleClear = () => {
    onFiltersChange({
      search: '',
      userId: '',
      dateFrom: '',
      dateTo: '',
    })
  }

  // Check if any filters are active
  const hasActiveFilters =
    filters.search || filters.userId || filters.dateFrom || filters.dateTo

  return (
    <div
      className={cn(
        'p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900',
        className
      )}
    >
      {/* Main Search Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por conteudo da mensagem..."
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn(
              'gap-2',
              showAdvanced && 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
            )}
          >
            <Filter className="h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1 h-5 w-5 flex items-center justify-center bg-blue-600 text-white text-xs rounded-full">
                !
              </span>
            )}
          </Button>

          {/* Export Dropdown */}
          <div className="relative group">
            <Button
              variant="outline"
              className="gap-2"
              disabled={exportLoading}
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <div className="absolute right-0 top-full mt-1 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[120px]">
              <button
                onClick={() => onExport('csv')}
                disabled={exportLoading}
                className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                CSV
              </button>
              <button
                onClick={() => onExport('json')}
                disabled={exportLoading}
                className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* User Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ID do Usuario
              </label>
              <Input
                type="text"
                placeholder="Filtrar por usuario..."
                value={filters.userId}
                onChange={(e) => handleChange('userId', e.target.value)}
              />
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Inicial
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleChange('dateFrom', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Final
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleChange('dateTo', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar Filtros
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
