import React from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SessionType,
  AtaStatus,
  AtaFiltersType,
  SESSION_TYPES,
  ATA_STATUSES
} from '@/types/ata'

interface AtaFiltersProps {
  filters: AtaFiltersType
  onFiltersChange: (filters: AtaFiltersType) => void
  onSearch: () => void
  onClear: () => void
  isLoading?: boolean
}

/**
 * AtaFilters Component
 *
 * Provides filtering controls for the atas list including:
 * - Text search
 * - Session type filter
 * - Status filter
 * - Date range filter
 * - Year filter
 */
export function AtaFilters({
  filters,
  onFiltersChange,
  onSearch,
  onClear,
  isLoading = false
}: AtaFiltersProps) {

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: e.target.value })
  }

  const handleSessionTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as SessionType | 'all'
    onFiltersChange({ ...filters, sessionType: value })
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as AtaStatus | 'all'
    onFiltersChange({ ...filters, status: value })
  }

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, dateFrom: e.target.value })
  }

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, dateTo: e.target.value })
  }

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    onFiltersChange({ ...filters, year: value ? parseInt(value) : undefined })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch()
    }
  }

  // Generate year options (current year and 10 years back)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - i)

  const hasActiveFilters =
    filters.search ||
    (filters.sessionType && filters.sessionType !== 'all') ||
    (filters.status && filters.status !== 'all') ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.year

  return (
    <Card className="glass glass-dark border-0">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Buscar por titulo, resumo ou numero da sessao..."
                value={filters.search || ''}
                onChange={handleSearchChange}
                onKeyPress={handleKeyPress}
                icon={<Search className="h-5 w-5 text-gray-400" />}
                className="focus:ring-virtualis-blue-500/50 focus:border-virtualis-blue-500/50"
                aria-label="Buscar atas"
              />
            </div>
            <Button
              variant="primary"
              onClick={onSearch}
              disabled={isLoading}
              isLoading={isLoading}
              aria-label="Buscar"
            >
              Buscar
            </Button>
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Session Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo de Sessao
              </label>
              <select
                value={filters.sessionType || 'all'}
                onChange={handleSessionTypeChange}
                className={cn(
                  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
                  'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                  'focus:outline-none focus:ring-2 focus:ring-virtualis-blue-500 focus:border-transparent',
                  'transition-colors text-sm'
                )}
                aria-label="Filtrar por tipo de sessao"
              >
                <option value="all">Todos os tipos</option>
                {Object.entries(SESSION_TYPES).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filters.status || 'all'}
                onChange={handleStatusChange}
                className={cn(
                  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
                  'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                  'focus:outline-none focus:ring-2 focus:ring-virtualis-blue-500 focus:border-transparent',
                  'transition-colors text-sm'
                )}
                aria-label="Filtrar por status"
              >
                <option value="all">Todos os status</option>
                {Object.entries(ATA_STATUSES).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ano
              </label>
              <select
                value={filters.year || ''}
                onChange={handleYearChange}
                className={cn(
                  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
                  'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                  'focus:outline-none focus:ring-2 focus:ring-virtualis-blue-500 focus:border-transparent',
                  'transition-colors text-sm'
                )}
                aria-label="Filtrar por ano"
              >
                <option value="">Todos os anos</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Inicial
              </label>
              <Input
                type="date"
                value={filters.dateFrom || ''}
                onChange={handleDateFromChange}
                className="text-sm"
                aria-label="Data inicial"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Final
              </label>
              <Input
                type="date"
                value={filters.dateTo || ''}
                onChange={handleDateToChange}
                className="text-sm"
                aria-label="Data final"
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar filtros
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default AtaFilters
