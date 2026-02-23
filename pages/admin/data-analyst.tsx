import React, { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Database, Sparkles, Loader2, Plus } from 'lucide-react'
import { AdminLayout } from '@/components/admin'
import {
  QueryInput,
  QueryHistory,
  DataAnalystSidebar,
  type QueryResultData,
  type QueryHistoryItem,
  type QueryHistoryResponse,
  type QueryResponse,
  type ServerPaginationState,
} from '@/components/admin/data-analyst'
import { adminDataAnalystService } from '@/lib/api'
import toast from 'react-hot-toast'

// Lazy load QueryResult component (contains charts and complex visualizations)
const QueryResult = dynamic(
  () => import('@/components/admin/data-analyst').then(mod => ({ default: mod.QueryResult })),
  {
    loading: () => (
      <div className="animate-pulse h-96 bg-gray-100 dark:bg-gray-800 rounded-xl" />
    ),
    ssr: false
  }
)

/**
 * Data Analyst Page
 * Natural language interface for querying analytics data with auto-generated charts
 */
export default function DataAnalystPage() {
  // State for query execution
  const [currentResult, setCurrentResult] = useState<QueryResultData | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)

  // State for history
  const [history, setHistory] = useState<QueryHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | undefined>()

  // State for pagination
  const [historyPage, setHistoryPage] = useState(1)
  const [hasMoreHistory, setHasMoreHistory] = useState(true)
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false)

  // State for analytics period
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'7d' | '30d' | 'this_month'>('30d')

  // State for execution progress
  const [executionProgress, setExecutionProgress] = useState<{
    stage: string
    percentage: number
  } | null>(null)

  // Refs for progress timers (cleanup)
  const progressTimersRef = useRef<NodeJS.Timeout[]>([])

  // State for server-side pagination (when results have >100 rows)
  const [serverPagination, setServerPagination] = useState<ServerPaginationState | null>(null)

  // Threshold for enabling server-side pagination
  const SERVER_PAGINATION_THRESHOLD = 100

  /**
   * Start a new conversation (clear current result)
   */
  const handleNewConversation = useCallback(() => {
    setCurrentResult(null)
    setSelectedHistoryId(undefined)
    setServerPagination(null)
  }, [])

  /**
   * Load query history on mount
   */
  useEffect(() => {
    loadHistory()
  }, [])

  /**
   * Load query history from API with pagination support
   */
  const loadHistory = async (page = 1, append = false) => {
    try {
      if (append) {
        setLoadingMoreHistory(true)
      } else {
        setHistoryLoading(true)
      }

      const response = await adminDataAnalystService.getHistory({
        page,
        limit: 20
      })
      const historyResponse = response as QueryHistoryResponse

      if (append) {
        setHistory(prev => [...prev, ...(historyResponse?.items || [])])
      } else {
        setHistory(historyResponse?.items || [])
      }

      const totalPages = historyResponse?.totalPages || 1
      setHasMoreHistory(page < totalPages)
      setHistoryPage(page)

    } catch (error) {
      console.error('Error loading history:', error)
      toast.error('Erro ao carregar historico')
      if (!append) {
        setHistory([])
      }
    } finally {
      setHistoryLoading(false)
      setLoadingMoreHistory(false)
    }
  }

  /**
   * Handler for loading more history items
   */
  const handleLoadMoreHistory = async () => {
    if (loadingMoreHistory || !hasMoreHistory) return
    await loadHistory(historyPage + 1, true)
  }

  /**
   * Execute a natural language query
   */
  const handleQuerySubmit = useCallback(async (query: string) => {
    // Clear previous progress timers
    progressTimersRef.current.forEach(t => clearTimeout(t))
    progressTimersRef.current = []

    setIsExecuting(true)
    setSelectedHistoryId(undefined)
    setServerPagination(null) // Reset server-side pagination

    // Start progress simulation
    setExecutionProgress({ stage: 'Analisando pergunta...', percentage: 20 })

    progressTimersRef.current.push(
      setTimeout(() => setExecutionProgress({ stage: 'Gerando SQL...', percentage: 50 }), 500),
      setTimeout(() => setExecutionProgress({ stage: 'Executando query...', percentage: 80 }), 1000)
    )

    // Create placeholder result for loading state
    const placeholderResult: QueryResultData = {
      id: `temp-${Date.now()}`,
      query,
      data: [],
      columns: [],
      response: '',
      status: 'executing',
      rowCount: 0,
      createdAt: new Date().toISOString(),
    }
    setCurrentResult(placeholderResult)

    try {
      const response = await adminDataAnalystService.query({ query })
      const queryResponse = response as QueryResponse

      if (queryResponse?.success && queryResponse.data) {
        const result: QueryResultData = {
          ...queryResponse.data,
          status: 'completed',
        }
        setCurrentResult(result)

        // Initialize server-side pagination if result has >100 rows
        const rowCount = typeof result.rowCount === 'number' ? result.rowCount : 0
        if (rowCount > SERVER_PAGINATION_THRESHOLD && result.id) {
          // Fetch first page of paginated results
          try {
            const paginatedResponse = await adminDataAnalystService.getQueryResultsPaginated(
              result.id,
              { page: 1, limit: 50 }
            )
            setServerPagination({
              page: paginatedResponse.page,
              totalRows: paginatedResponse.total,
              totalPages: paginatedResponse.totalPages,
              data: paginatedResponse.data as Record<string, unknown>[],
              loading: false,
            })
          } catch (paginationError) {
            console.error('Error loading paginated results:', paginationError)
            // Fall back to client-side pagination
          }
        }

        // Only add to history if there's a valid queryId (not from cache)
        // Cache hits return queryId: null and fromCache: true
        const isFromCache = queryResponse.data.fromCache === true
        const hasValidQueryId = result.id && result.id !== null

        if (hasValidQueryId && !isFromCache) {
          // Add to history only for new queries (not cache hits)
          const responseText = result.response || result.message || ''
          const queryText = result.query || query
          const createdAt = result.createdAt || new Date().toISOString()
          const id = result.id
          const historyItem: QueryHistoryItem = {
            id,
            query: queryText,
            responsePreview: responseText.substring(0, 100) + '...',
            status: 'completed',
            rowCount,
            createdAt,
            isFavorite: false,
          }
          setHistory((prev) => [historyItem, ...prev])
          setSelectedHistoryId(id)
        }

        toast.success(isFromCache ? 'Resultado do cache' : 'Consulta executada com sucesso')
      } else {
        // Handle error from API
        const errorResult: QueryResultData = {
          ...placeholderResult,
          status: 'error',
          error: queryResponse?.error || 'Erro desconhecido na consulta',
        }
        setCurrentResult(errorResult)
        toast.error('Erro ao executar consulta')
      }
    } catch (error: any) {
      console.error('Query execution error:', error)

      const errorMessage = error?.response?.data?.error || error?.message || 'Erro ao executar consulta'
      const errorResult: QueryResultData = {
        ...placeholderResult,
        status: 'error',
        error: errorMessage,
      }
      setCurrentResult(errorResult)
      toast.error(errorMessage)
    } finally {
      // Clear progress timers and reset progress state
      progressTimersRef.current.forEach(t => clearTimeout(t))
      progressTimersRef.current = []
      setExecutionProgress(null)
      setIsExecuting(false)
    }
  }, [])

  /**
   * Handle history item selection
   */
  const handleHistorySelect = useCallback(async (item: QueryHistoryItem) => {
    setSelectedHistoryId(item.id)
    setServerPagination(null) // Reset pagination state

    try {
      // Load full result from API
      const response = await adminDataAnalystService.getQuery(item.id)
      const result = response as QueryResultData
      if (result) {
        // Normalizar resposta caso venha em formato diferente
        const normalizedResult: QueryResultData = {
          ...result,
          response: result.response || result.message || 'Sem resposta',
          data: Array.isArray(result.data) ? result.data : [],
          columns: result.columns || [],
        }
        setCurrentResult(normalizedResult)

        // Initialize server-side pagination if result has >100 rows
        if (normalizedResult.rowCount > SERVER_PAGINATION_THRESHOLD) {
          // Fetch first page of paginated results
          try {
            const paginatedResponse = await adminDataAnalystService.getQueryResultsPaginated(
              normalizedResult.id,
              { page: 1, limit: 50 }
            )
            setServerPagination({
              page: paginatedResponse.page,
              totalRows: paginatedResponse.total,
              totalPages: paginatedResponse.totalPages,
              data: paginatedResponse.data as Record<string, unknown>[],
              loading: false,
            })
          } catch (paginationError) {
            console.error('Error loading paginated results:', paginationError)
            // Fall back to client-side pagination
          }
        }
      }
    } catch (error) {
      console.error('Error loading query result:', error)
      // Create placeholder from history item
      setCurrentResult({
        id: item.id,
        query: item.query,
        data: [],
        columns: [],
        response: item.responsePreview,
        status: item.status,
        rowCount: item.rowCount,
        createdAt: item.createdAt,
        isFavorite: item.isFavorite,
      })
    }
  }, [SERVER_PAGINATION_THRESHOLD])

  /**
   * Handle favorite toggle
   */
  const handleFavoriteToggle = useCallback(async (id: string, isFavorite: boolean) => {
    try {
      await adminDataAnalystService.updateQuery(id, { isFavorite })

      // Update local state
      setHistory((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isFavorite } : item))
      )

      if (currentResult?.id === id) {
        setCurrentResult((prev) => (prev ? { ...prev, isFavorite } : null))
      }

      toast.success(isFavorite ? 'Adicionado aos favoritos' : 'Removido dos favoritos')
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('Erro ao atualizar favorito')
    }
  }, [currentResult])

  /**
   * Handle query deletion
   */
  const handleDelete = useCallback(async (id: string) => {
    try {
      await adminDataAnalystService.deleteQuery(id)

      // Update local state
      setHistory((prev) => prev.filter((item) => item.id !== id))

      if (currentResult?.id === id) {
        setCurrentResult(null)
        setSelectedHistoryId(undefined)
      }

      toast.success('Consulta excluida')
    } catch (error) {
      console.error('Error deleting query:', error)
      toast.error('Erro ao excluir consulta')
    }
  }, [currentResult])

  /**
   * Handle re-run query
   */
  const handleRerun = useCallback((query: string) => {
    handleQuerySubmit(query)
  }, [handleQuerySubmit])

  /**
   * Handle page change in server-side pagination mode
   */
  const handleResultPageChange = useCallback(async (newPage: number) => {
    if (!currentResult || !serverPagination) return

    // Set loading state
    setServerPagination(prev => prev ? { ...prev, loading: true } : null)

    try {
      const paginatedResponse = await adminDataAnalystService.getQueryResultsPaginated(
        currentResult.id,
        { page: newPage, limit: 50 }
      )
      setServerPagination({
        page: paginatedResponse.page,
        totalRows: paginatedResponse.total,
        totalPages: paginatedResponse.totalPages,
        data: paginatedResponse.data as Record<string, unknown>[],
        loading: false,
      })
    } catch (error) {
      console.error('Error loading page:', error)
      toast.error('Erro ao carregar pagina')
      setServerPagination(prev => prev ? { ...prev, loading: false } : null)
    }
  }, [currentResult, serverPagination])

  // Toggle history sidebar
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  // Toggle suggestions sidebar (Right)
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false)

  // Close sidebars on mobile when route changes
  useEffect(() => {
    setIsHistoryOpen(false)
    setIsSuggestionsOpen(false)
  }, [])

  return (
    <AdminLayout
      title="Data Analyst"
      description="Consultas em linguagem natural com gráficos automáticos"
    >
      <div className="flex h-[calc(100vh-6rem)] relative overflow-hidden bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        
        {/* Left Toggle Button (History) + New Conversation */}
        {!isHistoryOpen && (
          <div className="absolute left-4 top-4 z-20 flex gap-2">
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Abrir Historico"
            >
              <Database className="h-5 w-5 text-virtualis-blue-600 dark:text-virtualis-blue-400" />
            </button>
            {currentResult && (
              <button
                onClick={handleNewConversation}
                className="p-2 bg-virtualis-blue-600 hover:bg-virtualis-blue-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1"
                title="Nova Conversa"
              >
                <Plus className="h-5 w-5" />
                <span className="hidden sm:inline text-sm font-medium">Nova</span>
              </button>
            )}
          </div>
        )}

        {/* LEFT SIDEBAR - Query History */}
        <div 
          className={`
            absolute inset-y-0 left-0 z-30 w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out
            ${isHistoryOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800 h-16">
             <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
               <Database className="h-4 w-4 text-virtualis-blue-500" />
               Historico
             </h3>
             <div className="flex items-center gap-2">
               <button
                 onClick={() => {
                   handleNewConversation()
                   setIsHistoryOpen(false)
                 }}
                 className="p-1.5 rounded-md bg-virtualis-blue-600 hover:bg-virtualis-blue-700 text-white transition-colors"
                 title="Nova Conversa"
               >
                 <Plus className="h-4 w-4" />
               </button>
               <button
                 onClick={() => setIsHistoryOpen(false)}
                 className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                 title="Fechar"
               >
                 <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>
          </div>
          <div className="h-[calc(100%-64px)] overflow-y-auto">
            <QueryHistory
              items={history}
              selectedId={selectedHistoryId}
              loading={historyLoading}
              onSelect={(item) => {
                handleHistorySelect(item)
                if (window.innerWidth < 1024) setIsHistoryOpen(false)
              }}
              onFavoriteToggle={handleFavoriteToggle}
              onDelete={handleDelete}
              onLoadMore={handleLoadMoreHistory}
              hasMore={hasMoreHistory}
              loadingMore={loadingMoreHistory}
              className="border-none"
            />
          </div>
        </div>

        {/* CENTER - Content & Chat */}
        <div className={`
          flex-1 flex flex-col min-w-0 transition-all duration-300 relative
          ${isHistoryOpen ? 'lg:ml-80' : 'ml-0'}
          ${isSuggestionsOpen ? 'lg:mr-80' : 'mr-0'}
        `}>
          
          {/* Messages Area (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
            <div className="max-w-4xl mx-auto w-full min-h-full flex flex-col">
              
              {/* Empty State / Welcome */}
              {!isExecuting && !currentResult && (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-10 opacity-60">
                  <div className="p-6 bg-virtualis-blue-50 dark:bg-virtualis-blue-900/10 rounded-full">
                    <Sparkles className="h-12 w-12 text-virtualis-blue-500 opacity-50" />
                  </div>
                  <div className="max-w-md space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      Assistente de Dados
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                      Faça perguntas complexas sobre os dados legislativos e receba respostas instantâneas com gráficos.
                    </p>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isExecuting && (
                <div className="flex flex-col items-center justify-center py-20 flex-1">
                  <div className="relative">
                    <div className="absolute inset-0 bg-virtualis-blue-500/20 rounded-full animate-ping" />
                    <div className="relative p-6 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-100 dark:border-gray-700">
                      <Loader2 className="h-10 w-10 text-virtualis-blue-600 dark:text-virtualis-blue-400 animate-spin" />
                    </div>
                  </div>
                  <p className="mt-6 text-lg font-medium text-gray-900 dark:text-gray-100">
                    Analisando dados...
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs text-center mt-2">
                    Traduzindo sua pergunta para SQL e gerando visualizações.
                  </p>

                  {/* Progress Bar */}
                  {executionProgress && (
                    <div className="mt-6 w-full max-w-md mx-auto">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span>{executionProgress.stage}</span>
                        <span>{executionProgress.percentage}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-virtualis-blue-500 transition-all duration-300 ease-out"
                          style={{ width: `${executionProgress.percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Query Result */}
              {!isExecuting && currentResult && (
                <div className="animate-fade-in-up pb-4">
                  <QueryResult
                    result={currentResult}
                    loading={false}
                    onFavoriteToggle={handleFavoriteToggle}
                    onRerun={handleRerun}
                    serverPagination={serverPagination ?? undefined}
                    onPageChange={handleResultPageChange}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer Input Area (Fixed at bottom of center) */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-10">
            <div className="max-w-4xl mx-auto w-full">
              <QueryInput
                onSubmit={handleQuerySubmit}
                loading={isExecuting}
                disabled={isExecuting}
                placeholder="Ex: Qual vereador teve mais projetos aprovados em 2024?"
              />
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR - Suggestions & Insights (New Component) */}
        <DataAnalystSidebar
          isCollapsed={!isSuggestionsOpen}
          onToggleCollapse={() => setIsSuggestionsOpen(!isSuggestionsOpen)}
          analyticsPeriod={analyticsPeriod}
          setAnalyticsPeriod={setAnalyticsPeriod}
          onQuerySubmit={handleQuerySubmit}
          className="absolute inset-y-0 right-0 border-l border-gray-200 dark:border-gray-800"
        />

        {/* Overlays for Mobile */}
        {(isHistoryOpen || isSuggestionsOpen) && (
          <div 
            className="absolute inset-0 bg-black/20 z-20 backdrop-blur-sm lg:hidden pointer-events-auto"
            onClick={() => {
              setIsHistoryOpen(false)
              setIsSuggestionsOpen(false)
            }}
          />
        )}
      </div>
    </AdminLayout>
  )
}
