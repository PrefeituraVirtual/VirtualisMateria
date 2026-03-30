/**
 * AtaAIGenerator - Component for automatic ata generation via AI
 *
 * This component provides an interface to automatically generate legislative session
 * minutes (atas) from transcription jobs using AI (DeepSeek R1).
 *
 * Features:
 * - 6-phase progress tracking
 * - Validation warnings display
 * - Preview of generated ata text
 * - Link to view full ata
 *
 * @module components/atas/AtaAIGenerator
 */

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  FileText,
  Eye,
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { atasService } from '@/lib/api'
import toast from 'react-hot-toast'
import type { AIGenerationPhase } from '@/types/ata'
import { useRouter } from 'next/router'

/**
 * Props for the AtaAIGenerator component
 */
export interface AtaAIGeneratorProps {
  /** Session ID to generate ata for */
  sessionId: number
  /** Transcription job ID to use as source */
  transcriptionJobId: string
  /** Callback when ata is successfully generated */
  onSuccess?: (ataId: string) => void
}

/**
 * API Response structure for AI generation
 */
interface AIGenerationResponse {
  success: boolean
  data?: {
    ataId: string
    validation?: {
      contagem_votos?: boolean
      warnings?: string[]
      errors?: string[]
    }
    dbValidation?: {
      projetos_validados?: boolean
      projetos_nao_encontrados?: string[]
    }
    officialText?: string
    processingTimeSeconds?: number
  }
  error?: string
}

/**
 * Initial phases configuration
 */
const INITIAL_PHASES: AIGenerationPhase[] = [
  {
    phase: 1,
    name: 'Segmentação de Conteúdo',
    description: 'Separando conteúdo da ata anterior do conteúdo atual',
    status: 'pending'
  },
  {
    phase: 2,
    name: 'Extração Estruturada',
    description: 'Extraindo dados estruturados da sessão',
    status: 'pending'
  },
  {
    phase: 3,
    name: 'Validação de Consistência',
    description: 'Validando contagem de votos e dados',
    status: 'pending'
  },
  {
    phase: 4,
    name: 'Validação com Banco de Dados',
    description: 'Verificando projetos e vereadores',
    status: 'pending'
  },
  {
    phase: 5,
    name: 'Geração de Texto Oficial',
    description: 'Formatando ata no padrão oficial',
    status: 'pending'
  },
  {
    phase: 6,
    name: 'Armazenamento',
    description: 'Salvando ata no banco de dados',
    status: 'pending'
  }
]

/**
 * Phase Progress Indicator Component
 */
const PhaseProgress: React.FC<{ phases: AIGenerationPhase[] }> = ({ phases }) => {
  return (
    <div className="space-y-3">
      {phases.map((phase) => (
        <motion.div
          key={phase.phase}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: phase.phase * 0.1 }}
          className={cn(
            'flex items-start gap-3 p-3 rounded-lg border transition-colors',
            phase.status === 'completed' && 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
            phase.status === 'processing' && 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
            phase.status === 'error' && 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
            phase.status === 'pending' && 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          )}
        >
          <div className="flex-shrink-0 mt-0.5">
            {phase.status === 'completed' && (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            )}
            {phase.status === 'processing' && (
              <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
            )}
            {phase.status === 'error' && (
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
            {phase.status === 'pending' && (
              <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Fase {phase.phase}
              </span>
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                {phase.name}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {phase.message || phase.description}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/**
 * Validation Warnings Display Component
 */
const ValidationWarnings: React.FC<{
  validation?: {
    contagem_votos?: boolean
    warnings?: string[]
    errors?: string[]
  }
  dbValidation?: {
    projetos_validados?: boolean
    projetos_nao_encontrados?: string[]
  }
}> = ({ validation, dbValidation }) => {
  const hasWarnings = validation?.warnings && validation.warnings.length > 0
  const hasErrors = validation?.errors && validation.errors.length > 0
  const hasDbIssues = dbValidation?.projetos_nao_encontrados && dbValidation.projetos_nao_encontrados.length > 0

  if (!hasWarnings && !hasErrors && !hasDbIssues) return null

  return (
    <div className="space-y-2">
      {hasErrors && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-red-900 dark:text-red-200 mb-2">
                Erros de Validação
              </h4>
              <ul className="text-sm text-red-800 dark:text-red-300 space-y-1">
                {validation?.errors?.map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {hasWarnings && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-200 mb-2">
                Avisos de Validação
              </h4>
              <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                {validation?.warnings?.map((warning, idx) => (
                  <li key={idx}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {hasDbIssues && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-orange-900 dark:text-orange-200 mb-2">
                Projetos Não Encontrados
              </h4>
              <ul className="text-sm text-orange-800 dark:text-orange-300 space-y-1">
                {dbValidation?.projetos_nao_encontrados?.map((projeto, idx) => (
                  <li key={idx}>• {projeto}</li>
                ))}
              </ul>
              <p className="text-xs text-orange-700 dark:text-orange-400 mt-2">
                Verifique se os números dos projetos estão corretos no sistema
              </p>
            </div>
          </div>
        </div>
      )}

      {validation?.contagem_votos === false && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-red-900 dark:text-red-200 mb-1">
                Contagem de Votos Incorreta
              </h4>
              <p className="text-sm text-red-800 dark:text-red-300">
                O total de votos não corresponde ao número de presentes. Revise a ata manualmente.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * AtaAIGenerator Component
 *
 * Main component for AI-powered ata generation from transcriptions.
 * Displays generation progress, validation warnings, and provides preview.
 *
 * @example
 * ```tsx
 * <AtaAIGenerator
 *   sessionId={72}
 *   transcriptionJobId="abc-123"
 *   onSuccess={(ataId) => console.log('Generated ata:', ataId)}
 * />
 * ```
 */
export function AtaAIGenerator({
  sessionId,
  transcriptionJobId,
  onSuccess
}: AtaAIGeneratorProps) {
  const router = useRouter()

  // State
  const [isGenerating, setIsGenerating] = useState(false)
  const [phases, setPhases] = useState<AIGenerationPhase[]>(INITIAL_PHASES)
  const [generatedAtaId, setGeneratedAtaId] = useState<string | null>(null)
  const [validation, setValidation] = useState<AIGenerationResponse['data']>()
  const [previewText, setPreviewText] = useState<string>('')
  const [showPreview, setShowPreview] = useState(false)
  const [processingTime, setProcessingTime] = useState<number>(0)

  // State for existing ata check
  const [existingAtaId, setExistingAtaId] = useState<string | null>(null)
  const [isCheckingExistence, setIsCheckingExistence] = useState(true)

  /**
   * Check if ata already exists for this session
   */
  useEffect(() => {
    const checkExistingAta = async () => {
      try {
        const result = await atasService.checkAIGeneratedExists(sessionId)
        if (result.exists && result.ataId) {
          setExistingAtaId(result.ataId)
          setGeneratedAtaId(result.ataId) // result.ataId is already string
        }
      } catch {
        // Ata doesn't exist, which is fine
        console.log('No existing ata found for session:', sessionId)
      } finally {
        setIsCheckingExistence(false)
      }
    }
    checkExistingAta()
  }, [sessionId])

  /**
   * Updates a specific phase status
   */
  const updatePhase = useCallback((phaseNumber: number, status: AIGenerationPhase['status'], message?: string) => {
    setPhases(prev => prev.map(p =>
      p.phase === phaseNumber
        ? { ...p, status, message: message || p.description }
        : p
    ))
  }, [])

  /**
   * Simulates initial phase progression up to Phase 2 (Extraction)
   * This is where the long running process happens.
   */
  const startSimulation = useCallback(async () => {
    // Phase 1: Segmentation
    updatePhase(1, 'processing')
    await new Promise(resolve => setTimeout(resolve, 1500))
    updatePhase(1, 'completed', 'Conteúdo segmentado com sucesso')

    // Phase 2: Extraction (Start)
    updatePhase(2, 'processing', 'Extraindo dados estruturados com Virtualis (Isso pode levar alguns minutos)...')
  }, [updatePhase])

  /**
   * Completes the phases after API response is received
   */
  const completeSimulation = useCallback(async () => {
    // Phase 2: Complete
    updatePhase(2, 'completed', 'Dados extraídos com sucesso')

    // Fast-forward remaining phases since backend already did them
    const rapidDelay = 800;

    // Phase 3
    updatePhase(3, 'processing')
    await new Promise(resolve => setTimeout(resolve, rapidDelay))
    updatePhase(3, 'completed', 'Dados validados')

    // Phase 4
    updatePhase(4, 'processing')
    await new Promise(resolve => setTimeout(resolve, rapidDelay))
    updatePhase(4, 'completed', 'Validação com banco concluída')

    // Phase 5
    updatePhase(5, 'processing')
    await new Promise(resolve => setTimeout(resolve, rapidDelay))
    updatePhase(5, 'completed', 'Texto oficial gerado')

    // Phase 6
    updatePhase(6, 'completed', 'Ata salva no banco de dados')
  }, [updatePhase])

  /**
   * Handles AI generation request
   */
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    setPhases(INITIAL_PHASES)
    setGeneratedAtaId(null)
    setValidation(undefined)
    setPreviewText('')
    setShowPreview(false)

    const startTime = Date.now()

    try {
      // Start UI simulation (Phase 1 -> Phase 2 Processing)
      await startSimulation()

      // Make actual API call (Long running)
      // The UI will stay at Phase 2 "Processing" during this await
      const rawResponse = await atasService.generateFromAI(transcriptionJobId, sessionId)
      
      // The backend returns { success: true, ataId: '...', sessionId: '...' }
      // It does NOT return the full validation data in the POST response.
      // We need to fetch it separately or construct a partial response.
      
      let fullData: any = null
      
      if (rawResponse.success && rawResponse.ataId) {
        try {
          // Fetch full AI data to get validation results
          const aiDataResponse = await atasService.getAIData(rawResponse.ataId)
          if (aiDataResponse.success) {
            fullData = aiDataResponse.data
          }
        } catch (err) {
          console.error('Failed to fetch AI data details', err)
          // Fallback to just having the ID
          fullData = { ataId: rawResponse.ataId }
        }
      }

      // Convert API response to component state shape
      const response: AIGenerationResponse = {
        success: rawResponse.success,
        data: fullData ? {
          ...fullData,
          ataId: typeof fullData.ataId === 'string' ? fullData.ataId : String(fullData.ataId || rawResponse.ataId),
          validation: fullData.validation,
          dbValidation: fullData.dbValidation
        } : undefined
      }

      // When response comes back, finish the UI steps
      await completeSimulation()

      const elapsed = Math.round((Date.now() - startTime) / 1000)
      setProcessingTime(elapsed)

      if (response.success && response.data?.ataId) {
        setGeneratedAtaId(response.data.ataId)
        setValidation(response.data)
        setPreviewText('Ata gerada com sucesso!')

        toast.success('Ata gerada com sucesso!')

        if (onSuccess) {
          onSuccess(response.data.ataId)
        }
      } else {
        throw new Error('Erro ao gerar ata')
      }
    } catch (error: unknown) {
      // Mark current phase as error
      const currentPhase = phases.find(p => p.status === 'processing')
      if (currentPhase) {
        updatePhase(currentPhase.phase, 'error', 'Erro no processamento')
      }

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao gerar ata'
      toast.error(errorMessage)
      console.error('Error generating ata:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [transcriptionJobId, sessionId, startSimulation, completeSimulation, onSuccess, phases, updatePhase])

  /**
   * Navigates to the full ata view
   */
  const handleViewAta = useCallback(() => {
    if (generatedAtaId) {
      router.push(`/atas/${generatedAtaId}`)
    }
  }, [generatedAtaId, router])

  const hasStarted = phases.some(p => p.status !== 'pending')
  const isCompleted = generatedAtaId !== null

  return (
    <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 p-4 dark:border-purple-800 dark:from-purple-900/20 dark:to-blue-900/20 sm:p-6">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="flex flex-wrap items-center gap-2 text-base font-bold text-gray-900 dark:text-gray-100 sm:text-lg">
              Gerador de Ata Automático
              <Sparkles className="h-5 w-5 text-purple-500" />
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Use IA para gerar ata oficial a partir da transcrição
            </p>
          </div>
        </div>

        {/* Loading state while checking if ata exists */}
        {isCheckingExistence && (
          <div className="flex w-full items-center gap-2 text-gray-500 dark:text-gray-400 sm:w-auto">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Verificando...</span>
          </div>
        )}

        {/* Ata already exists - show view button */}
        {!isCheckingExistence && existingAtaId && !hasStarted && (
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Badge variant="default" className="bg-green-500 text-white">
              <CheckCircle className="h-3 w-3 mr-1" />
              Ata já Gerada
            </Badge>
            <Button
              onClick={handleViewAta}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 sm:w-auto"
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver Ata Completa
            </Button>
          </div>
        )}

        {/* Ata doesn't exist - show generate button */}
        {!isCheckingExistence && !existingAtaId && !hasStarted && (
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 sm:w-auto"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Gerar Ata Automaticamente
              </>
            )}
          </Button>
        )}
      </div>

      {/* Processing Info Banner */}
      {!hasStarted && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Como funciona:</strong> A IA analisa a transcrição em 6 fases,
            separando conteúdo da ata anterior, extraindo dados estruturados,
            validando votos e projetos, e gerando o texto oficial no padrão da Câmara.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            ⏱️ Tempo estimado: 30-60 segundos
          </p>
        </div>
      )}

      {/* Phase Progress */}
      <AnimatePresence>
        {hasStarted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4"
          >
            <PhaseProgress phases={phases} />

            {processingTime > 0 && (
              <div className="mt-3 text-center">
                <Badge variant="outline" className="text-xs">
                  ⏱️ Processado em {processingTime}s
                </Badge>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validation Warnings */}
      <AnimatePresence>
        {isCompleted && validation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <ValidationWarnings
              validation={validation.validation}
              dbValidation={validation.dbValidation}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview */}
      <AnimatePresence>
        {isCompleted && previewText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  Prévia do Texto Gerado
                </span>
              </div>
              {showPreview ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>

            <AnimatePresence>
              {showPreview && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <pre className="whitespace-pre-wrap break-words font-sans text-xs text-gray-700 dark:text-gray-300">
                      {previewText}...
                    </pre>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                      Mostrando primeiros 500 caracteres. Clique em "Ver Ata Completa" para visualizar tudo.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <AnimatePresence>
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex flex-col gap-3 sm:flex-row"
          >
            <Button
              onClick={handleViewAta}
              className="w-full flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver Ata Completa
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (generatedAtaId) {
                  window.open(`/atas/${generatedAtaId}`, '_blank')
                }
              }}
              className="w-full sm:w-auto"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Badge */}
      <AnimatePresence>
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 flex flex-col items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-center dark:border-green-800 dark:bg-green-900/20 sm:flex-row sm:text-left"
          >
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-900 dark:text-green-200">
              Ata gerada com sucesso! ID: {generatedAtaId}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AtaAIGenerator
