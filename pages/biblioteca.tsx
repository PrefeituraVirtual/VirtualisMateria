import React, { useState } from 'react'
import { SEOHead } from '@/components/common/SEOHead'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import {
  Zap, Brain, X, BarChart3, Info, Search, BookOpen, Check, Eye, Download,
  Share2, ChevronLeft, ChevronRight, FileText, Lightbulb
} from 'lucide-react'
import { MATERIA_TYPES } from '@/lib/constants'
import { materiasService, deepSeekService, api } from '@/lib/api'
import { getSecureItem } from '@/lib/secure-storage'
import { formatDate } from '@/lib/utils'
import { AnalysisResult } from '@/components/ai/DeepSeekAnalysis'
import { useDeepSeekCache } from '@/hooks/useDeepSeekCache'
import toast from 'react-hot-toast'

// Direct backend URL for AI calls that may take a long time
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000'

/** Remove markdown formatting characters from AI-generated text */
function stripMarkdown(text: string): string {
  if (!text) return text
  return text
    .replace(/#{1,6}\s+/g, '')        // ## headers
    .replace(/\*\*(.+?)\*\*/g, '$1')  // **bold**
    .replace(/\*(.+?)\*/g, '$1')      // *italic*
    .replace(/__(.+?)__/g, '$1')      // __bold__
    .replace(/_(.+?)_/g, '$1')        // _italic_
    .replace(/`(.+?)`/g, '$1')        // `code`
    .replace(/^[-*+]\s+/gm, '• ')     // - bullet points → clean bullet
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link](url)
    .replace(/^>\s?/gm, '')           // > blockquotes (start of line only)
    .trim()
}

/**
 * Call AI analyze endpoint directly (bypasses Next.js proxy for deep mode)
 */
async function analyzeDirectBackend(query: string, mode: 'fast' | 'deep', contextData?: any): Promise<any> {
  // Use cached token (same as search requests) with secure storage as fallback
  const token = api.getCachedToken() || (typeof window !== 'undefined' ? await getSecureItem<string>('authToken') : null)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 180000) // 3 minutes

  try {
    const response = await fetch(`${BACKEND_URL}/api/ai/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({ query, mode, contextData }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    return response.json()
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('A requisicao excedeu o tempo limite')
    }
    throw error
  }
}

export default function BibliotecaPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false)
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null)
  const [analysisMode, setAnalysisMode] = useState<'fast' | 'deep'>('fast')
  const [selectedDocuments, setSelectedDocuments] = useState<any[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisStep, setAnalysisStep] = useState('')
  const [viewingDocument, setViewingDocument] = useState<any>(null)
  const [isLoadingDocument, setIsLoadingDocument] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  // Cache hook
  const { get: getCachedAnalysis, set: setCachedAnalysis } = useDeepSeekCache({
    maxSize: 20,
    maxAge: 24 // 24 horas
  })

  const handleSemanticSearch = async (overrideQuery?: string, targetPage: number = 1) => {
    const queryToUse = overrideQuery || searchQuery
    
    if (!queryToUse.trim()) {
      toast.error('Digite algo para buscar')
      return
    }
    
    // Update visual state if override is used
    if (overrideQuery) {
      setSearchQuery(overrideQuery)
    }

    setIsSearching(true)
    try {
      // API returns { success: true, results: [...] }
      const response = await materiasService.search(queryToUse, targetPage)
      
      if (response?.success && response.results) {
        // Map backend results to frontend format (ensure id exists for analysis)
        const formattedResults = response.results.map((item: any) => ({
          ...item,
          id: item.materia_id || item.id, // Map materia_id to id for compatibility
          created_at: item.created_at || item.metadata?.data_apresentacao || item.metadata?.created_at
        }))
        
        setResults(formattedResults)

        // Backend returns pagination as: { pagination: { page, limit, total, totalPages } }
        const totalResults = response.pagination?.total || formattedResults.length
        const totalPages = response.pagination?.totalPages || Math.ceil(totalResults / pagination.limit)
        setPagination(prev => ({
          ...prev,
          page: targetPage,
          total: totalResults,
          totalPages: totalPages
        }))

        toast.success(`${totalResults} documentos encontrados`)
      } else if (Array.isArray(response)) {
        // Fallback if API returns array directly
        setResults(response)
        setPagination(prev => ({
          ...prev,
          page: 1,
          total: response.length,
          totalPages: 1
        }))
        toast.success(`${response.length} documentos encontrados`)
      } else {
        setResults([])
        toast.error('Formato de resposta inválido')
      }
    } catch (error) {
      console.error('Error searching:', error)
      toast.error('Erro ao realizar busca')
    } finally {
      setIsSearching(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      handleSemanticSearch(undefined, newPage)
      // Scroll to top of results
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleDocumentAnalysis = async (document: any) => {
    setSelectedDocuments([document])
    setShowAnalysisPanel(true)
    setCurrentAnalysis(null)
    setIsAnalyzing(true)
    setAnalysisProgress(0)
    setAnalysisStep('Iniciando análise...')

    // Verificar cache primeiro
    const cacheKey = `doc-analysis-${document.id}-${analysisMode}`
    const cached = getCachedAnalysis(cacheKey, analysisMode, { document })
    if (cached) {
      setCurrentAnalysis(cached)
      setIsAnalyzing(false)
      toast.success('Análise recuperada do cache!')
      return
    }

    // Definir etapas baseadas no modo
    const steps = analysisMode === 'deep' 
      ? [
          { progress: 10, step: 'Validando consulta...' },
          { progress: 20, step: 'Classificando tipo de análise...' },
          { progress: 30, step: 'Coletando contexto legislativo...' },
          { progress: 40, step: 'Busca semântica avançada...' },
          { progress: 55, step: 'Processamento R1 (raciocínio)...' },
          { progress: 70, step: 'Análise legislativa detalhada...' },
          { progress: 85, step: 'Verificação de conformidade...' },
          { progress: 95, step: 'Gerando recomendações...' },
        ]
      : [
          { progress: 20, step: 'Validando consulta...' },
          { progress: 45, step: 'Coletando contexto...' },
          { progress: 70, step: 'Análise rápida...' },
          { progress: 90, step: 'Formatando resultados...' },
        ]

    // Simular progresso em paralelo com a requisição
    let stepIndex = 0
    const progressInterval = setInterval(() => {
      if (stepIndex < steps.length) {
        setAnalysisProgress(steps[stepIndex].progress)
        setAnalysisStep(steps[stepIndex].step)
        stepIndex++
      }
    }, analysisMode === 'deep' ? 4000 : 1500)

    try {
      // Realizar análise do documento
      const analysisQuery = `Análise legislativa do documento: ${document.ementa || document.assunto || 'Sem título'}`
      const contextData = {
        document: {
          id: document.id,
          tipo: document.tipo,
          ementa: document.ementa,
          assunto: document.assunto,
          created_at: document.created_at
        },
        searchQuery
      }

      // Use direct backend call for deep mode to avoid proxy timeout
      const result = analysisMode === 'deep'
        ? await analyzeDirectBackend(analysisQuery, analysisMode, contextData)
        : await deepSeekService.analyze(analysisQuery, analysisMode, contextData)

      clearInterval(progressInterval)
      setAnalysisProgress(100)
      setAnalysisStep('Análise concluída!')

      // Salvar no cache
      setCachedAnalysis(cacheKey, analysisMode, result, { document })

      setCurrentAnalysis(result)
      setIsAnalyzing(false)
      toast.success(`Análise ${analysisMode === 'deep' ? 'profunda' : 'rápida'} concluída!`)
    } catch (error) {
      clearInterval(progressInterval)
      console.error('Analysis error:', error)
      setIsAnalyzing(false)
      toast.error('Erro ao analisar documento')
    }
  }

  const handleBatchAnalysis = async () => {
    if (selectedDocuments.length === 0) {
      toast.error('Selecione pelo menos um documento para analisar')
      return
    }

    setShowAnalysisPanel(true)
    setCurrentAnalysis(null)
    setIsAnalyzing(true)
    setAnalysisProgress(0)
    setAnalysisStep('Iniciando análise comparativa...')

    // Etapas de progresso para análise comparativa (sempre deep mode)
    const steps = [
      { progress: 10, step: 'Validando documentos selecionados...' },
      { progress: 20, step: `Preparando ${selectedDocuments.length} documentos...` },
      { progress: 35, step: 'Coletando contexto legislativo...' },
      { progress: 50, step: 'Busca semântica cruzada...' },
      { progress: 65, step: 'Processamento R1 (raciocínio comparativo)...' },
      { progress: 80, step: 'Comparando documentos...' },
      { progress: 90, step: 'Gerando análise comparativa...' },
      { progress: 95, step: 'Finalizando recomendações...' },
    ]

    let stepIndex = 0
    const progressInterval = setInterval(() => {
      if (stepIndex < steps.length) {
        setAnalysisProgress(steps[stepIndex].progress)
        setAnalysisStep(steps[stepIndex].step)
        stepIndex++
      }
    }, 4000)

    try {
      const documentsSummary = selectedDocuments.map(doc =>
        `${doc.tipo}: ${doc.ementa || doc.assunto || 'Sem título'}`
      ).join('\n')

      const analysisQuery = `Análise comparativa de ${selectedDocuments.length} documentos legislativos:\n${documentsSummary}`

      // Batch analysis always uses deep mode - use direct backend call
      const result = await analyzeDirectBackend(analysisQuery, 'deep', {
        documents: selectedDocuments,
        searchQuery,
        analysisType: 'comparative'
      })

      clearInterval(progressInterval)
      setAnalysisProgress(100)
      setAnalysisStep('Análise comparativa concluída!')

      setCurrentAnalysis(result)
      setIsAnalyzing(false)
      setSelectedDocuments([])
      toast.success('Análise comparativa concluída!')
    } catch (error) {
      clearInterval(progressInterval)
      console.error('Batch analysis error:', error)
      setIsAnalyzing(false)
      toast.error('Erro na análise comparativa')
    }
  }

  const toggleDocumentSelection = (document: any) => {
    setSelectedDocuments(prev => {
      const isSelected = prev.some(doc => doc.id === document.id)
      if (isSelected) {
        return prev.filter(doc => doc.id !== document.id)
      } else {
        return [...prev, document]
      }
    })
  }

  const handleView = async (doc: any) => {
    setIsLoadingDocument(true)
    try {
      // Buscar detalhes completos da matéria
      const materia = await materiasService.get(String(doc.id || doc.materia_id))
      setViewingDocument(materia || doc)
    } catch (error) {
      console.error('Error fetching document:', error)
      // Se falhar, usar os dados que já temos
      setViewingDocument(doc)
    } finally {
      setIsLoadingDocument(false)
    }
  }

  const handleDownload = (doc: any) => {
    try {
      if (!doc.content && !doc.ementa) {
        toast.error('Conteúdo indisponível para download')
        return
      }

      const content = `
${doc.ementa || 'Sem título'}
==================================================

Assunto: ${doc.assunto || 'Não informado'}
Tipo: ${doc.tipo || 'Não informado'}
Data: ${doc.created_at ? formatDate(doc.created_at) : 'Não informada'}

==================================================

${doc.content || 'Conteúdo textual não disponível.'}
      `.trim()

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `documento_${doc.id}.txt`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Download iniciado')
    } catch (error) {
      console.error('Download error:', error)

        toast.error('Erro ao baixar documento')
    }
  }

  const popularSearches = [
    'Educação e Inovação',
    'Infraestrutura Urbana',
    'Saúde Municipal',
    'Meio Ambiente e Reciclagem',
    'Assistência Social',
    'Segurança Pública',
    'Cultura e Lazer',
    'Transparência Pública',
    'Mobilidade Urbana',
    'Direitos da Mulher',
  ]

  return (
    <>
      <SEOHead
        title="Biblioteca Jurídica - Documentos e Templates"
        description="Acesse biblioteca de documentos legislativos, templates e referências jurídicas"
        canonical="/biblioteca"
      />

      <MainLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Biblioteca Jurídica
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Busca semântica inteligente em 3.140 documentos legislativos processados
            </p>
          </div>

          {/* Analysis Controls */}
          <Card className="glass glass-dark border-0">
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Analysis Mode */}
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Análise com IA Avançada
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => setAnalysisMode('fast')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        analysisMode === 'fast'
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Zap className="h-4 w-4 inline mr-2" />
                      Análise Rápida
                    </button>
                    <button
                      onClick={() => setAnalysisMode('deep')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        analysisMode === 'deep'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-500/20'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Brain className="h-4 w-4 inline mr-2" />
                      Análise Profunda (R1)
                    </button>
                  </div>
                </div>

                {/* Batch Actions */}
                {selectedDocuments.length > 0 && (
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      Análise em Lote ({selectedDocuments.length} selecionados)
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleBatchAnalysis}
                        variant="primary"
                        size="sm"
                        className="flex-1"
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analisar Comparativo
                      </Button>
                      <Button
                        onClick={() => setSelectedDocuments([])}
                        variant="outline"
                        size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  {analysisMode === 'deep'
                    ? 'Análise profunda com Raciocínio da Virtualis pode levar até 2 minutos, mas oferece resultados mais detalhados.'
                    : 'Análise rápida para insights imediatos sobre os documentos.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Search Box */}
          <Card className="glass glass-dark border-0">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Busque por temas, palavras-chave ou contexto... (ex: 'leis sobre meio ambiente urbano')"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSemanticSearch()}
                    icon={<Search className="h-5 w-5 text-gray-400" />}
                    className="focus:ring-virtualis-gold-500/50 focus:border-virtualis-gold-500/50"
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={() => handleSemanticSearch()}
                  disabled={isSearching}
                  isLoading={isSearching}
                >
                  Buscar
                </Button>
              </div>

              {/* Popular Searches */}
              <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Buscas populares:
                </p>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((search) => (
                    <button
                      key={search}
                      onClick={() => handleSemanticSearch(search)}
                      className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-virtualis-gold-100 dark:hover:bg-virtualis-gold-900/20 hover:text-virtualis-gold-700 dark:hover:text-virtualis-gold-400 hover:border-virtualis-gold-200 dark:hover:border-virtualis-gold-800 border border-transparent transition-all duration-300"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="glass glass-dark border-0">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">+3.000</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Projetos de lei disponíveis</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass glass-dark border-0">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                    <Search className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">Busca IA</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Encontre projetos por assunto</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Resultados da Busca ({pagination.total})
                </h2>
                {selectedDocuments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedDocuments.length} selecionados
                    </span>
                    <Button
                      onClick={() => setSelectedDocuments([])}
                      variant="outline"
                      size="sm"
                    >
                      Limpar seleção
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {results.map((result, index) => {
                  const tipoConfig = MATERIA_TYPES[result.tipo as keyof typeof MATERIA_TYPES]
                  const isSelected = selectedDocuments.some(doc => doc.id === result.id)
                  return (
                    <Card key={index} hover className={`glass glass-dark transition-all duration-300 ${
                      isSelected
                        ? 'border-amber-500/50 bg-amber-50/5 dark:bg-amber-900/10'
                        : 'hover:border-virtualis-gold-500/30'
                    }`}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {/* Selection Checkbox */}
                              <button
                                onClick={() => toggleDocumentSelection(result)}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? 'bg-amber-500 border-amber-500 text-white'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-amber-400'
                                }`}
                              >
                                {isSelected && <Check className="h-3 w-3" />}
                              </button>

                              <Badge variant="info">
                                {tipoConfig?.label || result.tipo}
                              </Badge>
                              {result.similarity_score && (
                                <Badge variant="success" className="bg-virtualis-gold-100 text-virtualis-gold-800 border-virtualis-gold-200 dark:bg-virtualis-gold-900/30 dark:text-virtualis-gold-300 dark:border-virtualis-gold-800">
                                  {Math.round(result.similarity_score * 100)}% relevante
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                              {result.ementa}
                            </h3>
                            {result.assunto && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {result.assunto.substring(0, 200)}...
                              </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              Criado em {formatDate(result.created_at)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {/* Analysis Button */}
                            <Button
                              onClick={() => handleDocumentAnalysis(result)}
                              variant={analysisMode === 'deep' ? 'premium' : 'primary'}
                              size="sm"
                              className="hover:border-amber-500/50"
                            >
                              <Brain className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="hover:border-virtualis-gold-500/50 hover:text-virtualis-gold-600"
                              onClick={() => handleView(result)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="hover:border-virtualis-gold-500/50 hover:text-virtualis-gold-600"
                              onClick={() => handleDownload(result)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1 || isSearching}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Anterior
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Página {pagination.page} de {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages || isSearching}
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!isSearching && results.length === 0 && searchQuery && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Nenhum resultado encontrado
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Tente usar outras palavras-chave ou temas diferentes
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Initial State */}
          {!searchQuery && results.length === 0 && (
            <Card className="glass glass-dark border-0">
              <CardContent className="py-12">
                <div className="text-center max-w-2xl mx-auto">
                  <div className="p-4 bg-virtualis-blue-100 dark:bg-virtualis-blue-900/30 rounded-full inline-block mb-4 border border-virtualis-blue-200 dark:border-virtualis-blue-800">
                    <BookOpen className="h-12 w-12 text-virtualis-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Busca Semântica Inteligente
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Nossa IA entende o contexto da sua busca, não apenas palavras-chave. 
                    Encontre precedentes, verifique similaridade com leis existentes e analise a
                    constitucionalidade das suas propostas.
                  </p>
                  <div className="flex items-start gap-3 text-left bg-virtualis-gold-50 dark:bg-virtualis-gold-900/10 rounded-lg p-4 border border-virtualis-gold-100 dark:border-virtualis-gold-900/30">
                    <Lightbulb className="h-5 w-5 text-virtualis-gold-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                        Para que serve esta ferramenta?
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Use a Biblioteca Jurídica para pesquisar se sua ideia de projeto já existe,
                        encontrar leis correlatas para embasamento e realizar análises profundas
                        de conformidade jurídica antes de protocolar.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Analysis Panel */}
        {showAnalysisPanel && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Brain className="h-6 w-6 text-amber-500" />
                    Análise Documental
                  </h3>
                  <button
                    onClick={() => {
                      setShowAnalysisPanel(false)
                      setCurrentAnalysis(null)
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                {currentAnalysis ? (
                  <div className="space-y-6">
                    {/* Analysis Summary */}
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Resumo da Análise
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-amber-600">{currentAnalysis.confidence}%</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Confiança</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{currentAnalysis.processingTime}s</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Tempo</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{currentAnalysis.result.compliance.score}%</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Conformidade</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-amber-600">{currentAnalysis.result.recommendations.length}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Recomendações</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {stripMarkdown(currentAnalysis.result.summary)}
                      </p>
                    </div>

                    {/* Detailed Analysis */}
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Análise Detalhada
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {stripMarkdown(currentAnalysis.result.detailedAnalysis)}
                        </p>
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Recomendações
                      </h4>
                      <div className="space-y-2">
                        {currentAnalysis.result.recommendations.map((rec, index) => (
                          <div key={index} className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mt-0.5">
                              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                {index + 1}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {stripMarkdown(rec)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        onClick={() => {
                          setShowAnalysisPanel(false)
                          setCurrentAnalysis(null)
                        }}
                        variant="primary"
                        className="flex-1"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Concluído
                      </Button>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Exportar
                      </Button>
                      <Button variant="outline">
                        <Share2 className="h-4 w-4 mr-2" />
                        Compartilhar
                      </Button>
                    </div>
                  </div>
                ) : isAnalyzing ? (
                  <div className="space-y-6 py-8">
                    {/* Progress Bar */}
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full mb-4">
                        <Brain className="h-8 w-8 text-white animate-pulse" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {analysisMode === 'deep' ? 'Análise Profunda (R1)' : 'Análise Rápida'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {analysisMode === 'deep' ? 'Usando raciocínio avançado' : 'Processando consulta'}
                      </p>
                    </div>

                    {/* Progress */}
                    <div className="max-w-md mx-auto">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Progresso
                        </span>
                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                          {analysisProgress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${analysisProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Current Step */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 max-w-md mx-auto border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-3">
                        <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          {analysisStep}
                        </span>
                      </div>
                    </div>

                    {/* Estimated Time */}
                    <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                      {analysisMode === 'deep' 
                        ? 'Tempo estimado: 30-60 segundos' 
                        : 'Tempo estimado: 10-20 segundos'}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Selecione um documento para analisar</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Document Viewing Modal */}
        {(viewingDocument || isLoadingDocument) && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Visualização do Documento
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Modo somente leitura
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingDocument(null)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                {isLoadingDocument ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="h-10 w-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Carregando documento...</p>
                  </div>
                ) : viewingDocument ? (
                  <div className="space-y-6">
                    {/* Badge and Title */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="info">
                          {MATERIA_TYPES[viewingDocument.tipo as keyof typeof MATERIA_TYPES]?.label || viewingDocument.tipo}
                        </Badge>
                        {viewingDocument.numero && (
                          <Badge variant="outline">#{viewingDocument.numero}</Badge>
                        )}
                        {viewingDocument.status && (
                          <Badge variant="outline" className="capitalize">{viewingDocument.status}</Badge>
                        )}
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {viewingDocument.ementa || 'Sem ementa'}
                      </h4>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                      {viewingDocument.assunto && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Assunto</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100">{viewingDocument.assunto}</p>
                        </div>
                      )}
                      {viewingDocument.created_at && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Criado em</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100">{formatDate(viewingDocument.created_at)}</p>
                        </div>
                      )}
                      {viewingDocument.autor && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Autor</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100">{viewingDocument.autor}</p>
                        </div>
                      )}
                      {viewingDocument.protocolo && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Protocolo</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100 font-mono">{viewingDocument.protocolo}</p>
                        </div>
                      )}
                    </div>

                    {/* Document Content */}
                    {(viewingDocument.texto_original || viewingDocument.content) && (
                      <div>
                        <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Texto do Documento
                        </h5>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                          <div 
                            className="prose dark:prose-invert max-w-none text-sm"
                            dangerouslySetInnerHTML={{ 
                              __html: (viewingDocument.texto_original || viewingDocument.content || '')
                                .replace(/\n/g, '<br/>') 
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <Info className="h-3 w-3 inline mr-1" />
                    Este documento pertence a outro autor e não pode ser editado
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewingDocument && handleDownload(viewingDocument)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setViewingDocument(null)}
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </MainLayout>
    </>
  )
}
