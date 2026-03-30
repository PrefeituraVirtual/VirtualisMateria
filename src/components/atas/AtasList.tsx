import React from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { AtaCard } from './AtaCard'
import { AtaSummary, AtaPagination } from '@/types/ata'

interface AtasListProps {
  atas: AtaSummary[]
  pagination: AtaPagination
  isLoading: boolean
  onView: (ata: AtaSummary) => void
  onEdit?: (ata: AtaSummary) => void
  onDelete?: (ata: AtaSummary) => void
  onPageChange: (page: number) => void
  selectedAtas?: AtaSummary[]
  onSelectAta?: (ata: AtaSummary) => void
}

/**
 * AtasList Component
 *
 * Renders a list of ata cards with pagination controls.
 * Supports selection mode for batch operations.
 */
export function AtasList({
  atas,
  pagination,
  isLoading,
  onView,
  onEdit,
  onDelete,
  onPageChange,
  selectedAtas = [],
  onSelectAta
}: AtasListProps) {

  const isSelected = (ata: AtaSummary) => {
    return selectedAtas.some((s) => s.id === ata.id)
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex gap-2 mb-2">
                    <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                  <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Empty State
  if (atas.length === 0) {
    return (
      <Card className="glass glass-dark border-0">
        <CardContent className="py-12">
          <div className="text-center">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full inline-block mb-4">
              <FileText className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Nenhuma ata encontrada
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Nao foram encontradas atas com os filtros selecionados.
              Tente ajustar os filtros ou limpar a busca.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Mostrando {atas.length} de {pagination.total} atas
        </p>
        {selectedAtas.length > 0 && (
          <p className="text-sm text-virtualis-blue-600 dark:text-virtualis-blue-400">
            {selectedAtas.length} ata(s) selecionada(s)
          </p>
        )}
      </div>

      {/* Atas List */}
      <div className="space-y-3">
        {atas.map((ata) => (
          <AtaCard
            key={ata.id}
            ata={ata}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            isSelected={isSelected(ata)}
            onSelect={onSelectAta}
          />
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1 || isLoading}
            aria-label="Pagina anterior"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Anterior</span>
          </Button>

          <div className="flex max-w-full items-center gap-2 overflow-x-auto px-1">
            {/* First Page */}
            {pagination.page > 2 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPageChange(1)}
                  className="w-8 h-8 p-0"
                >
                  1
                </Button>
                {pagination.page > 3 && (
                  <span className="text-gray-400">...</span>
                )}
              </>
            )}

            {/* Previous Page */}
            {pagination.page > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPageChange(pagination.page - 1)}
                className="w-8 h-8 p-0"
              >
                {pagination.page - 1}
              </Button>
            )}

            {/* Current Page */}
            <Button
              variant="primary"
              size="sm"
              className="w-8 h-8 p-0"
              disabled
            >
              {pagination.page}
            </Button>

            {/* Next Page */}
            {pagination.page < pagination.totalPages && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPageChange(pagination.page + 1)}
                className="w-8 h-8 p-0"
              >
                {pagination.page + 1}
              </Button>
            )}

            {/* Last Page */}
            {pagination.page < pagination.totalPages - 1 && (
              <>
                {pagination.page < pagination.totalPages - 2 && (
                  <span className="text-gray-400">...</span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPageChange(pagination.totalPages)}
                  className="w-8 h-8 p-0"
                >
                  {pagination.totalPages}
                </Button>
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages || isLoading}
            aria-label="Proxima pagina"
          >
            <span className="hidden sm:inline">Proximo</span>
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )
}

export default AtasList
