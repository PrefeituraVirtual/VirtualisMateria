/**
 * TranscriptionAnalysisModal - Modal for AI analysis of completed transcriptions
 *
 * This component provides AI-powered analysis of legislative session transcriptions
 * using DeepSeek Reasoner (R1). It displays structured analysis including:
 * - Executive summary
 * - Key discussion points
 * - Decisions and votes
 * - Referenced projects (PLs, Indicacoes, Requerimentos)
 * - Recommendations for follow-up
 *
 * @module components/transcricao/TranscriptionAnalysisModal
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  X,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  Clock,
  Download,
  Calendar,
  Info,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { transcriptionService } from '@/lib/api'
import toast from 'react-hot-toast'
import type { TranscriptionAnalysis } from '@/types/api'

/**
 * Props for the TranscriptionAnalysisModal component
 */
export interface TranscriptionAnalysisModalProps {
  /** Controls modal visibility */
  isOpen: boolean
  /** Callback to close the modal */
  onClose: () => void
  /** The transcription job ID to analyze */
  jobId: string
  /** Display name for the transcription job */
  jobName: string
}

/**
 * Response structure from the analysis API
 */
interface AnalysisResponse {
  success: boolean
  data?: TranscriptionAnalysis
  cached?: boolean
  processingTime?: number
  exists?: boolean
  analysis?: unknown
  sessionInfo?: {
    numero: number
    data: string
    tipo: string
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isTranscriptionAnalysis = (value: unknown): value is TranscriptionAnalysis => {
  if (!isRecord(value)) return false
  return (
    typeof value.summary === 'string' &&
    Array.isArray(value.keyPoints) &&
    Array.isArray(value.decisions)
  )
}

const formatAnalysis = (analysisData: TranscriptionAnalysis): string => {
  const sections = [
    analysisData.summary ? `## RESUMO EXECUTIVO\n${analysisData.summary}` : null,
    analysisData.keyPoints.length
      ? `\n## PONTOS-CHAVE\n${analysisData.keyPoints.map((point) => `- ${point}`).join('\n')}`
      : null,
    analysisData.decisions.length
      ? `\n## DECISOES\n${analysisData.decisions.map((decision) => `- ${decision}`).join('\n')}`
      : null,
  ]
  return sections.filter(Boolean).join('\n')
}

const normalizeAnalysisData = (data: unknown): string | null => {
  // 1. Check for R1 Legislative Structure (New Backend Default)
  if (isRecord(data) && isRecord(data.legislativeAnalysis)) {
    const leg = data.legislativeAnalysis as Record<string, unknown>
    // Prefer technicalAnalysis if available
    if (typeof leg.technicalAnalysis === 'string') {
      return leg.technicalAnalysis
    }
    
    // Fallback: Construct it manually if technicalAnalysis is missing
    const parts: string[] = []
    if (typeof leg.summary === 'string') parts.push(`## RESUMO EXECUTIVO\n${leg.summary}`)
    if (typeof leg.recommendations === 'string') parts.push(`\n## RECOMENDAÇÕES\n${leg.recommendations}`)
    
    return parts.length > 0 ? parts.join('\n') : null

  }

  // 1.5 Check for Strategic Analysis (New Strategic Mode)
  // Check against the structure defined in legislative-reasoning-service.js
  if (isRecord(data) && typeof data.resumo_executivo === 'string' && isRecord(data.analise_politica)) {
    const strategic = data as any
    const parts: string[] = []

    parts.push(`## RESUMO EXECUTIVO (Estratégico)\n${strategic.resumo_executivo}`)

    // Termômetro Político
    if (strategic.analise_politica) {
      parts.push(`\n## 🌡️ TERMÔMETRO POLÍTICO`)
      parts.push(`**Nível de Tensão:** ${strategic.analise_politica.nivel_tensao || 'Não informado'}`)
      
      if (Array.isArray(strategic.analise_politica.mudancas_aliancas) && strategic.analise_politica.mudancas_aliancas.length > 0) {
         parts.push(`\n**Movimentações:**\n${strategic.analise_politica.mudancas_aliancas.map((m: string) => `- ${m}`).join('\n')}`)
      }
      
      if (Array.isArray(strategic.analise_politica.destaques_atuacao) && strategic.analise_politica.destaques_atuacao.length > 0) {
         parts.push(`\n**Destaques:**\n${strategic.analise_politica.destaques_atuacao.map((d: any) => `- **${d.vereador}:** ${d.observacao}`).join('\n')}`)
      }
    }

    // Radar Jurídico
    if (Array.isArray(strategic.radar_juridico) && strategic.radar_juridico.length > 0) {
      parts.push(`\n## ⚖️ RADAR JURÍDICO`)
      strategic.radar_juridico.forEach((item: any) => {
        parts.push(`- **${item.projeto || 'Item'}** (${item.risco || 'Risco Indefinido'})`)
        if (item.motivo) parts.push(`  _Motivo:_ ${item.motivo}`)
        if (item.recomendacao) parts.push(`  _Recomendação:_ ${item.recomendacao}`)
      })
    }

    // Tendências
    if (Array.isArray(strategic.sinais_tendencias) && strategic.sinais_tendencias.length > 0) {
      parts.push(`\n## 📈 TENDÊNCIAS E SINAIS`)
      parts.push(strategic.sinais_tendencias.map((t: string) => `- ${t}`).join('\n'))
    }

    return parts.join('\n')
  }
  if (isTranscriptionAnalysis(data)) {
    return formatAnalysis(data)
  }

  // 3. Check for raw string
  if (typeof data === 'string') {
    return data
  }

  return null
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (isRecord(error) && 'response' in error && isRecord(error.response)) {
    const response = error.response
    if (isRecord(response.data) && typeof response.data.error === 'string') {
      return response.data.error
    }
  }
  return 'Erro desconhecido ao processar analise'
}

/**
 * TranscriptionAnalysisModal Component
 *
 * Modal component for displaying AI analysis results from DeepSeek Reasoner.
 * Features:
 * - Initial state with "Iniciar Analise" button (purple theme)
 * - Loading state with spinner during processing (30-60 seconds)
 * - Error state with retry option
 * - Result display with copy-to-clipboard functionality
 * - Uses createPortal for proper z-index
 * - Dark mode support
 * - Animations with framer-motion
 *
 * @example
 * ```tsx
 * <TranscriptionAnalysisModal
 *   isOpen={showAnalysis}
 *   onClose={() => setShowAnalysis(false)}
 *   jobId="abc123"
 *   jobName="Sessao Ordinaria #42"
 * />
 * ```
 */
export function TranscriptionAnalysisModal({
  isOpen,
  onClose,
  jobId,
  jobName
}: TranscriptionAnalysisModalProps) {
  // Core states
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzed, setIsAnalyzed] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [processingTime, setProcessingTime] = useState(0)

  // Additional metadata states
  const [sessionInfo, setSessionInfo] = useState<AnalysisResponse['sessionInfo'] | null>(null)
  const [wasCached, setWasCached] = useState(false)
  const [apiProcessingTime, setApiProcessingTime] = useState<number>(0)

  // Refs
  const overlayRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Reset modal state when closed or jobId changes
   */
  useEffect(() => {
    if (!isOpen) {
      // Reset all states when modal closes
      setIsLoading(false)
      setIsAnalyzed(false)
      setAnalysis(null)
      setError(null)
      setCopied(false)
      setProcessingTime(0)
      setSessionInfo(null)
      setWasCached(false)
      setApiProcessingTime(0)

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isOpen])

  /**
   * Check for existing analysis when modal opens
   */
  useEffect(() => {
    if (isOpen && jobId) {
      const checkExistingAnalysis = async () => {
        try {
          const response = await transcriptionService.getAnalysis(jobId)
          const analysisResponse = response as AnalysisResponse

          if (analysisResponse.success && analysisResponse.exists) {
            const rawData = analysisResponse.data ?? analysisResponse.analysis
            const normalizedAnalysis = normalizeAnalysisData(rawData)
            
            if (normalizedAnalysis) {
              setAnalysis(normalizedAnalysis)
              setSessionInfo(analysisResponse.sessionInfo || null)
              setApiProcessingTime(analysisResponse.processingTime || 0)
              setWasCached(true)
              setIsAnalyzed(true)
            }
          }
        } catch {
          // No existing analysis, user can start new one
          console.log('No existing analysis found')
        }
      }
      checkExistingAnalysis()
    }
  }, [isOpen, jobId])

  /**
   * Handle escape key and body scroll lock
   */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, isLoading, onClose])

  /**
   * Handle overlay click to close modal
   */
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current && !isLoading) {
      onClose()
    }
  }

  /**
   * Start the analysis process
   */
  const handleStartAnalysis = useCallback(async () => {
    if (!jobId) return

    setIsLoading(true)
    setError(null)
    setProcessingTime(0)

    // Start elapsed time counter
    timerRef.current = setInterval(() => {
      setProcessingTime(prev => prev + 1)
    }, 1000)

    try {
      const response = await transcriptionService.analyzeTranscription(jobId)

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      if (response.success) {
        const analysisResponse = response as AnalysisResponse
        
        console.log('🔍 [DEBUG] Analysis Response:', JSON.stringify(analysisResponse, null, 2))
        
        // Normalize response data (handle both 'data' and 'analysis' keys)
        const rawData = analysisResponse.data ?? analysisResponse.analysis
        console.log('🔍 [DEBUG] Raw Data:', JSON.stringify(rawData, null, 2))

        const normalizedAnalysis = normalizeAnalysisData(rawData)
        console.log('🔍 [DEBUG] Normalized:', normalizedAnalysis)

        if (normalizedAnalysis) {
            setAnalysis(normalizedAnalysis)
            setSessionInfo(analysisResponse.sessionInfo || null)
            setApiProcessingTime(analysisResponse.processingTime || 0)
            setWasCached(Boolean(analysisResponse.cached))
            setIsAnalyzed(true)

            toast.success('Analise concluida com sucesso!', {
            icon: '🧠',
            duration: 4000
            })
        } else {
            throw new Error('Formato de analise desconhecido ou vazio')
        }
      } else {
        throw new Error('Falha ao processar analise')
      }
    } catch (err: unknown) {
      console.error('Analysis error:', err)
      setError(getErrorMessage(err))
      toast.error('Erro na analise. Tente novamente.')
    } finally {
      setIsLoading(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [jobId])

  /**
   * Copy analysis text to clipboard
   */
  const handleCopyToClipboard = useCallback(async () => {
    if (!analysis) return

    try {
      await navigator.clipboard.writeText(analysis)
      setCopied(true)
      toast.success('Analise copiada para a area de transferencia')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      toast.error('Erro ao copiar para a area de transferencia')
    }
  }, [analysis])

  /**
   * Download analysis as text file
   */
  const handleDownload = useCallback(() => {
    if (!analysis) return

    const blob = new Blob([analysis], { type: 'text/plain;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const sanitizedName = jobName.replace(/[^a-zA-Z0-9]/g, '_')
    link.download = `analise_virtualis_${sanitizedName}_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    toast.success('Download iniciado!')
  }, [analysis, jobName])

  /**
   * Format time in MM:SS format
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // SSR safety check
  if (typeof document === 'undefined') return null
  if (!isOpen) return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="analysis-modal-title"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn(
            'relative w-full max-w-3xl max-h-[90vh] overflow-hidden',
            'bg-white dark:bg-gray-900 rounded-2xl shadow-2xl',
            'border border-purple-200 dark:border-purple-800/50'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-6 py-4 border-b border-purple-100 dark:border-purple-800/30 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 p-2.5 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl shadow-lg shadow-purple-500/25">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2
                  id="analysis-modal-title"
                  className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                >
                  Analise Virtualis
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {jobName}
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={isLoading}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
                  isLoading && 'opacity-50 cursor-not-allowed'
                )}
                aria-label="Fechar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Session Info Badge */}
          {sessionInfo && (
            <div className="px-6 pt-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
                <Calendar className="h-4 w-4" />
                <span>
                  Sessao {sessionInfo.tipo} #{sessionInfo.numero} -{' '}
                  {new Date(sessionInfo.data).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Initial State - Show "Iniciar Analise" button */}
            {!isLoading && !isAnalyzed && !error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
                <div className="mx-auto w-20 h-20 mb-6 bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 rounded-2xl flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Analise com Inteligencia Artificial
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  Utilize a Virtualis para extrair insights, resumos e pontos-chave
                  da transcricao da sessao legislativa.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-purple-600 dark:text-purple-400 mb-6">
                  <Clock className="h-4 w-4" />
                  <span>Tempo estimado: 30-60 segundos</span>
                </div>
                <Button
                  onClick={handleStartAnalysis}
                  className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 px-8 py-3 text-base"
                >
                  <Brain className="h-5 w-5 mr-2" />
                  Iniciar Analise
                </Button>
              </motion.div>
            )}

            {/* Loading State */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <div className="relative mx-auto w-24 h-24 mb-6">
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-purple-100 dark:border-purple-900/30" />
                  {/* Spinning ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 dark:border-t-purple-400 animate-spin" />
                  {/* Inner icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Brain className="h-10 w-10 text-purple-600 dark:text-purple-400 animate-pulse" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Processando Analise...
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  DeepSeek Reasoner esta analisando a transcricao
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-full text-purple-700 dark:text-purple-300 text-sm font-medium">
                  <Clock className="h-4 w-4" />
                  <span>Tempo decorrido: {formatTime(processingTime)}</span>
                </div>
                <div className="mt-4 max-w-xs mx-auto">
                  <div className="h-2 bg-purple-100 dark:bg-purple-900/30 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-violet-500"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 60, ease: 'linear' }}
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <Info className="h-3 w-3" />
                  <span>A analise pode levar de 30 segundos a 2 minutos</span>
                </div>
              </motion.div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
                <div className="mx-auto w-20 h-20 mb-6 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center">
                  <AlertCircle className="h-10 w-10 text-red-500 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Erro na Analise
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-2 max-w-md mx-auto">
                  Nao foi possivel processar a analise da transcricao.
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mb-6 max-w-md mx-auto bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
                  {error}
                </p>
                <Button
                  onClick={handleStartAnalysis}
                  className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg shadow-purple-500/25"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar Novamente
                </Button>
              </motion.div>
            )}

            {/* Analysis Results */}
            {isAnalyzed && analysis && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Success Badge */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Check className="h-5 w-5" />
                    <span className="font-medium">Analise concluida em {formatTime(processingTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {wasCached && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                        <Zap className="h-3 w-3" />
                        Cache
                      </span>
                    )}
                    {apiProcessingTime > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        API: {(apiProcessingTime / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                </div>

                {/* Analysis content */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300 leading-relaxed overflow-auto max-h-[400px]">
                    {analysis}
                  </pre>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            {isAnalyzed && analysis && !isLoading ? (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span>Analise gerada por IA (DeepSeek Reasoner)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartAnalysis}
                    className="text-gray-600 dark:text-gray-400"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Nova Analise
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Baixar
                  </Button>
                  <Button
                    onClick={handleCopyToClipboard}
                    size="sm"
                    className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span>Powered by Virtualis</span>
                </div>
                <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
                  Fechar
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

export default TranscriptionAnalysisModal
