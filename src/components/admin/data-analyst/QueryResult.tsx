import React, { useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import {
  Table2,
  BarChart3,
  SplitSquareHorizontal,
  Clock,
  Database,
  RefreshCw,
  Star,
  StarOff,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Code,
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  BookmarkPlus,
  Zap,
} from 'lucide-react'
import { adminDataAnalystService } from '@/lib/api'
import { toast } from 'sonner'
import type { QueryResult as QueryResultData, ViewMode, ChartType, BasicChartType, AdvancedChartType } from './types'
import { ResultTable } from './ResultTable'
import type { ResultChartProps } from './ResultChart'
import { ChartTypeSelector, isAdvancedChartType } from './ChartTypeSelector'
import { AdvancedCharts } from './AdvancedCharts'

// Dynamic import for ResultChart (heavy Recharts dependency)
const ResultChart = dynamic<ResultChartProps>(
  () => import('./ResultChart').then(mod => mod.ResultChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[350px] rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 animate-pulse">
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="h-full bg-gray-100 dark:bg-gray-800 rounded" />
      </div>
    ),
  }
)

/**
 * Server-side pagination state
 */
export interface ServerPaginationState {
  /** Current page (1-indexed) */
  page: number
  /** Total number of rows */
  totalRows: number
  /** Total number of pages */
  totalPages: number
  /** Current page data */
  data: Record<string, unknown>[]
  /** Whether a page change is loading */
  loading: boolean
}

/**
 * Props for QueryResult component
 */
export interface QueryResultProps {
  /** Query result data */
  result: QueryResultData
  /** Loading state */
  loading?: boolean
  /** Callback for favorite toggle */
  onFavoriteToggle?: (id: string, isFavorite: boolean) => void
  /** Callback for re-run query */
  onRerun?: (query: string) => void
  /** Additional className */
  className?: string
  /** Server-side pagination state (when result has >100 rows) */
  serverPagination?: ServerPaginationState
  /** Callback when page changes in server-side pagination mode */
  onPageChange?: (page: number) => void
}

/**
 * View mode button configuration
 */
const VIEW_MODES: { mode: ViewMode; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { mode: 'table', icon: Table2, label: 'Tabela' },
  { mode: 'chart', icon: BarChart3, label: 'Grafico' },
  { mode: 'split', icon: SplitSquareHorizontal, label: 'Dividido' },
]

/**
 * Format execution time for display
 */
const formatExecutionTime = (ms?: number): string => {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

/**
 * QueryResult Component
 * Container for displaying query results with view mode toggle,
 * AI response, and metadata
 */
export function QueryResult({
  result,
  loading = false,
  onFavoriteToggle,
  onRerun,
  className,
  serverPagination,
  onPageChange,
}: QueryResultProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(result.chartConfig ? 'chart' : 'table')
  const [showReasoning, setShowReasoning] = useState(false)
  const [showSql, setShowSql] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState<'csv' | 'json' | 'xlsx' | null>(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [reportTitle, setReportTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedChartType, setSelectedChartType] = useState<ChartType>(
    result.chartConfig?.type || 'bar'
  )
  const responseText = result.response || result.message || 'Resposta não disponível'

  /**
   * Available chart types based on data
   */
  const availableChartTypes = useMemo((): ChartType[] => {
    const basic: BasicChartType[] = ['line', 'bar', 'pie', 'area']
    const advanced: AdvancedChartType[] = []

    // Add heatmap if data has x, y, value structure or temporal data
    if (result.data?.length > 0) {
      const firstRow = result.data[0]
      const keys = Object.keys(firstRow)
      if (keys.length >= 2) {
        advanced.push('heatmap')
      }
      // Add treemap for hierarchical/category data
      if (keys.some(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('categoria'))) {
        advanced.push('treemap')
      }
      // Add gauge for single metric data
      if (result.data.length === 1 && keys.some(k =>
        k.toLowerCase().includes('taxa') ||
        k.toLowerCase().includes('percent') ||
        k.toLowerCase().includes('score')
      )) {
        advanced.push('gauge')
      }
    }

    return [...basic, ...advanced]
  }, [result.data])

  /**
   * Handle copy SQL to clipboard
   */
  const handleCopySql = async () => {
    if (result.sqlQuery) {
      await navigator.clipboard.writeText(result.sqlQuery)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  /**
   * Handle export to different formats
   */
  const handleExport = async (format: 'csv' | 'json' | 'xlsx') => {
    if (!result.data || result.data.length === 0) {
      toast.error('Nao ha dados para exportar')
      return
    }

    try {
      setExporting(format)
      const response = await adminDataAnalystService.exportQuery(result.id, format)

      // Criar blob e download
      const blob = response instanceof Blob
        ? response
        : new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' })

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `consulta-${result.id.slice(0, 8)}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success(`Exportado como ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Erro ao exportar:', error)
      toast.error('Erro ao exportar dados')
    } finally {
      setExporting(null)
    }
  }

  /**
   * Handle save as quick report
   */
  const handleSaveAsQuickReport = async () => {
    if (!reportTitle.trim()) {
      toast.error('Digite um titulo para o relatorio')
      return
    }
    try {
      setSaving(true)
      await adminDataAnalystService.saveAsQuickReport(result.id, reportTitle.trim())
      toast.success('Salvo como relatorio rapido!')
      setShowSaveDialog(false)
      setReportTitle('')
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar relatorio')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Determine if chart can be shown
   */
  const canShowChart = useMemo(() => {
    return result.chartConfig && result.data && result.data.length > 0
  }, [result.chartConfig, result.data])

  /**
   * Render loading skeleton
   */
  if (loading) {
    return (
      <div
        className={cn(
          'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6',
          className
        )}
      >
        <div className="animate-pulse space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>

          {/* Content skeleton */}
          <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" />

          {/* Footer skeleton */}
          <div className="flex gap-4">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    )
  }

  /**
   * Render error state
   */
  if (result.status === 'error') {
    return (
      <div
        className={cn(
          'rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6',
          className
        )}
      >
        <div className="flex items-start gap-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
            <Database className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Erro na consulta
            </h3>
            <p className="text-red-700 dark:text-red-300 mb-4">{result.error}</p>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              Consulta original: &quot;{result.query}&quot;
            </p>
            {onRerun && (
              <button
                onClick={() => onRerun(result.query)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </button>
            )}
          </div>
        </div>
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
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {/* Query and response */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Original query */}
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Database className="h-4 w-4" />
              <span className="truncate">{result.query}</span>
            </div>

            {/* AI Response */}
            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-gray-100">
              <ReactMarkdown>{responseText}</ReactMarkdown>
            </div>

            {/* Reasoning toggle */}
            {result.reasoning && (
              <div className="mt-2">
                <button
                  onClick={() => setShowReasoning(!showReasoning)}
                  className="flex items-center gap-2 text-sm text-virtualis-blue-600 dark:text-virtualis-blue-400 hover:underline"
                >
                  {showReasoning ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {showReasoning ? 'Ocultar raciocinio' : 'Ver raciocinio da IA'}
                </button>

                {showReasoning && (
                  <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                      {result.reasoning}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* SQL Query toggle */}
            {result.sqlQuery && (
              <div className="mt-2">
                <button
                  onClick={() => setShowSql(!showSql)}
                  className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <Code className="h-4 w-4" />
                  {showSql ? 'Ocultar SQL' : 'Ver SQL gerado'}
                </button>

                {showSql && (
                  <div className="mt-3 relative">
                    <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto font-mono">
                      {result.sqlQuery}
                    </pre>
                    <button
                      onClick={handleCopySql}
                      className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                      aria-label="Copiar SQL"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* View mode toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {VIEW_MODES.map(({ mode, icon: Icon, label }) => {
                const isDisabled = mode !== 'table' && !canShowChart
                return (
                  <button
                    key={mode}
                    onClick={() => !isDisabled && setViewMode(mode)}
                    disabled={isDisabled}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                      viewMode === mode
                        ? 'bg-white dark:bg-gray-700 text-virtualis-blue-600 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
                      isDisabled && 'opacity-40 cursor-not-allowed'
                    )}
                    title={isDisabled ? 'Grafico nao disponivel para esta consulta' : label}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                )
              })}
            </div>

            {/* Favorite button */}
            {onFavoriteToggle && (
              <button
                onClick={() => onFavoriteToggle(result.id, !result.isFavorite)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  result.isFavorite
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400'
                )}
                aria-label={result.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              >
                {result.isFavorite ? (
                  <Star className="h-4 w-4 fill-current" />
                ) : (
                  <StarOff className="h-4 w-4" />
                )}
              </button>
            )}

            {/* Re-run button */}
            {onRerun && (
              <button
                onClick={() => onRerun(result.query)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-virtualis-blue-600 dark:hover:text-virtualis-blue-400 transition-colors"
                aria-label="Executar novamente"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}

            {/* Export dropdown */}
            {result.data && result.data.length > 0 && (
              <div className="relative group">
                <button
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
                    'hover:text-green-600 dark:hover:text-green-400'
                  )}
                  aria-label="Exportar dados"
                >
                  <Download className="h-4 w-4" />
                </button>
                <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                  <button
                    onClick={() => handleExport('csv')}
                    disabled={exporting !== null}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg disabled:opacity-50"
                  >
                    <FileText className="h-4 w-4" />
                    {exporting === 'csv' ? 'Exportando...' : 'CSV'}
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    disabled={exporting !== null}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    <FileJson className="h-4 w-4" />
                    {exporting === 'json' ? 'Exportando...' : 'JSON'}
                  </button>
                  <button
                    onClick={() => handleExport('xlsx')}
                    disabled={exporting !== null}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg disabled:opacity-50"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    {exporting === 'xlsx' ? 'Exportando...' : 'Excel'}
                  </button>
                </div>
              </div>
            )}

            {/* Save as Quick Report */}
            <button
              onClick={() => setShowSaveDialog(true)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              aria-label="Salvar como relatorio rapido"
              title="Salvar como relatorio rapido"
            >
              <BookmarkPlus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Save as Quick Report Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Salvar como Relatorio Rapido
            </h3>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="Nome do relatorio..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowSaveDialog(false)
                  setReportTitle('')
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAsQuickReport}
                disabled={saving || !reportTitle.trim()}
                className="px-4 py-2 bg-virtualis-blue-600 text-white rounded-lg hover:bg-virtualis-blue-700 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {viewMode === 'table' && (
          <ResultTable
            data={serverPagination ? serverPagination.data : result.data}
            columns={result.columns}
            pageSize={serverPagination ? 50 : 10}
            maxHeight="400px"
            serverSidePagination={!!serverPagination}
            page={serverPagination?.page}
            totalRows={serverPagination?.totalRows}
            totalPages={serverPagination?.totalPages}
            onPageChange={onPageChange}
            pageLoading={serverPagination?.loading}
          />
        )}

        {viewMode === 'chart' && canShowChart && (
          <div className="space-y-4">
            {/* Chart Type Selector */}
            <div className="flex justify-end">
              <ChartTypeSelector
                currentType={selectedChartType}
                availableTypes={availableChartTypes}
                onTypeChange={setSelectedChartType}
                size="sm"
              />
            </div>

            {/* Chart Rendering */}
            {isAdvancedChartType(selectedChartType) ? (
              <AdvancedCharts
                type={selectedChartType}
                data={result.data}
                height={350}
                xKey={result.chartConfig?.xAxisKey}
                valueKey={result.chartConfig?.yAxisKeys?.[0]}
                nameKey={result.chartConfig?.xAxisKey}
                title={result.chartConfig?.title}
              />
            ) : (
              <ResultChart
                data={result.data}
                config={{ ...result.chartConfig!, type: selectedChartType as BasicChartType }}
                height={350}
              />
            )}
          </div>
        )}

        {viewMode === 'split' && canShowChart && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Chart Type Selector */}
              <div className="flex justify-end">
                <ChartTypeSelector
                  currentType={selectedChartType}
                  availableTypes={availableChartTypes}
                  onTypeChange={setSelectedChartType}
                  size="sm"
                />
              </div>

              {/* Chart Rendering */}
              {isAdvancedChartType(selectedChartType) ? (
                <AdvancedCharts
                  type={selectedChartType}
                  data={result.data}
                  height={300}
                  xKey={result.chartConfig?.xAxisKey}
                  valueKey={result.chartConfig?.yAxisKeys?.[0]}
                  nameKey={result.chartConfig?.xAxisKey}
                />
              ) : (
                <ResultChart
                  data={result.data}
                  config={{ ...result.chartConfig!, type: selectedChartType as BasicChartType }}
                  height={300}
                />
              )}
            </div>
            <ResultTable
              data={serverPagination ? serverPagination.data : result.data}
              columns={result.columns}
              pageSize={serverPagination ? 50 : 5}
              maxHeight="350px"
              serverSidePagination={!!serverPagination}
              page={serverPagination?.page}
              totalRows={serverPagination?.totalRows}
              totalPages={serverPagination?.totalPages}
              onPageChange={onPageChange}
              pageLoading={serverPagination?.loading}
            />
          </div>
        )}
      </div>

      {/* Footer with metadata */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          {/* Row count */}
          <div className="flex items-center gap-1">
            <Database className="h-4 w-4" />
            <span>{result.rowCount.toLocaleString('pt-BR')} resultados</span>
          </div>

          {/* Execution time */}
          {result.executionTime !== undefined && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formatExecutionTime(result.executionTime)}</span>
            </div>
          )}

          {/* Iterations */}
          {result.iterations !== undefined && result.iterations > 1 && (
            <div className="flex items-center gap-1">
              <RefreshCw className="h-4 w-4" />
              <span>{result.iterations} iteracoes</span>
            </div>
          )}

          {/* Cache badge */}
          {result.fromCache && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
              <Zap className="h-3 w-3" />
              Cache
            </span>
          )}

          {/* Timestamp */}
          <div className="ml-auto text-xs">
            {new Date(result.createdAt).toLocaleString('pt-BR')}
          </div>
        </div>
      </div>
    </div>
  )
}
