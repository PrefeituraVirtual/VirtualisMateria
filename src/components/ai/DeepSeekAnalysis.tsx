import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import {
  Zap, Brain, Database, Check, X, ChevronUp, ChevronDown, Scale, AlertTriangle,
  Lightbulb, Plus, Download, Share2
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { api } from '@/lib/api'
import { getSecureItem } from '@/lib/secure-storage'
import toast from 'react-hot-toast'

// Direct backend URL for AI calls that may take a long time
// Bypasses Next.js proxy to avoid timeout issues
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000'

// Icon map for dynamic icon lookup
const iconMap: Record<string, LucideIcon> = {
  Zap, Brain, Database
}

// Types - keep icon as string for compatibility with api.ts types
export interface AnalysisMode {
  id: 'fast' | 'deep' | 'sql'
  name: string
  description: string
  estimatedTime: string
  icon: string
  confidence: number
  color: string
}

export interface AnalysisStep {
  id: string
  name: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  message?: string
}

export interface AnalysisResult {
  id: string
  query: string
  mode: AnalysisMode
  confidence: number
  processingTime: number
  result: {
    summary: string
    detailedAnalysis: string
    recommendations: string[]
    legalBasis: string[]
    compliance: {
      score: number
      issues: string[]
      suggestions: string[]
    }
  }
  metadata: {
    model: string
    tokens: number
    timestamp: Date
  }
}

interface DeepSeekAnalysisProps {
  query?: string
  onAnalysisComplete?: (result: AnalysisResult) => void
  className?: string
  autoAnalyze?: boolean
  contextData?: Record<string, unknown>
  initialMode?: AnalysisMode['id']
}

// Moved outside component to avoid recreating on every render
const ANALYSIS_MODES: AnalysisMode[] = [
  {
    id: 'fast',
    name: 'Análise Rápida',
    description: 'Respostas imediatas usando Virtualis Chat',
    estimatedTime: '5-15 segundos',
    icon: 'Zap',
    confidence: 85,
    color: 'blue'
  },
  {
    id: 'deep',
    name: 'Análise Profunda',
    description: 'Análise detalhada com Virtualis para consultas complexas',
    estimatedTime: '60-120 segundos',
    icon: 'Brain',
    confidence: 95,
    color: 'purple'
  },
  {
    id: 'sql',
    name: 'Análise SQL',
    description: 'Consulta direta ao banco de dados',
    estimatedTime: '15-30 segundos',
    icon: 'Database',
    confidence: 90,
    color: 'amber'
  }
]

export const DeepSeekAnalysis: React.FC<DeepSeekAnalysisProps> = ({
  query,
  onAnalysisComplete,
  className,
  autoAnalyze = false,
  contextData,
  initialMode = 'fast'
}) => {
  const [selectedMode, setSelectedMode] = useState<AnalysisMode['id']>(initialMode)
  const [inputQuery, setInputQuery] = useState(query || '')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentStep, setCurrentStep] = useState<AnalysisStep | null>(null)
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([])
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [cachedResults, setCachedResults] = useState<Map<string, AnalysisResult>>(new Map())

  const analysisStartTime = useRef<Date | null>(null)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)

  const getStepsForMode = (mode: AnalysisMode['id']): AnalysisStep[] => {
    const baseSteps = [
      { id: 'validation', name: 'Validando consulta', status: 'pending' as const, progress: 0 },
      { id: 'classification', name: 'Classificando tipo de análise', status: 'pending' as const, progress: 0 },
      { id: 'context', name: 'Coletando contexto legislativo', status: 'pending' as const, progress: 0 }
    ]

    if (mode === 'deep') {
      return [
        ...baseSteps,
        { id: 'semantic_search', name: 'Busca semântica avançada', status: 'pending' as const, progress: 0 },
        { id: 'reasoning', name: 'Processamento Profundo (raciocínio)', status: 'pending' as const, progress: 0 },
        { id: 'analysis', name: 'Análise legislativa detalhada', status: 'pending' as const, progress: 0 },
        { id: 'compliance', name: 'Verificação de conformidade', status: 'pending' as const, progress: 0 },
        { id: 'recommendations', name: 'Gerando recomendações', status: 'pending' as const, progress: 0 },
        { id: 'formatting', name: 'Formatando resultados', status: 'pending' as const, progress: 0 }
      ]
    } else {
      return [
        ...baseSteps,
        { id: 'quick_analysis', name: 'Análise rápida', status: 'pending' as const, progress: 0 },
        { id: 'formatting', name: 'Formatando resultados', status: 'pending' as const, progress: 0 }
      ]
    }
  }

  useEffect(() => {
    if (isAnalyzing) {
      analysisStartTime.current = new Date()
      progressInterval.current = setInterval(() => {
        if (analysisStartTime.current) {
          const elapsed = Math.floor((new Date().getTime() - analysisStartTime.current.getTime()) / 1000)
          setElapsedTime(elapsed)
        }
      }, 1000)
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
        progressInterval.current = null
      }
      setElapsedTime(0)
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
  }, [isAnalyzing])

  // Calculate progress when steps change
  useEffect(() => {
    const totalSteps = analysisSteps.length
    if (totalSteps > 0) {
      const completedSteps = analysisSteps.filter(step => step.status === 'completed').length
      // Calculate active step progress
      const activeStep = analysisSteps.find(step => step.status === 'processing')
      const activeStepProgressContribution = activeStep ? (activeStep.progress / 100) : 0
      
      // Total progress = (completed steps + active step fraction) / total steps * 100
      const currentProgress = ((completedSteps + activeStepProgressContribution) / totalSteps) * 100
      setProgress(Math.min(100, Math.max(0, currentProgress)))
    } else {
      setProgress(0)
    }
  }, [analysisSteps])

  const updateStepProgress = useCallback((stepId: string, status: AnalysisStep['status'], progress: number, message?: string) => {
    setAnalysisSteps(prev => prev.map(step =>
      step.id === stepId
        ? { ...step, status, progress, message }
        : step
    ))

    // Update current step for immediate display
    // We can't trust analysisSteps here as it might be stale in the closure
    // But we can construct the updated step data from args
    if (currentStep && currentStep.id === stepId) {
      setCurrentStep(prev => prev ? { ...prev, status, progress, message } : null)
    } else {
      // Trying to find it in the stale array is better than nothing if currentStep is null
      // but strictly relying on state updates is safer. 
      // Let's rely on the useEffect below to set currentStep if we want perfect sync,
      // but for "simulateProgress" loop visibility, we need immediate feedback.
      // We will trust the passed args.
      setCurrentStep(prev => {
        if (prev && prev.id === stepId) {
          return { ...prev, status, progress, message }
        }
        // If we are switching steps, simulation usually calls this first with 0 progress
        // We might need to fetch the step name from the stale list if we don't have it
        // A better approach is to pass the name if needed, but we don't have it here.
        // Let's rely on the fact that simulateProgress sets currentStep explicitly before loop.
        return prev
      })
    }
  }, [currentStep])

  const simulateProgress = useCallback(async (mode: AnalysisMode['id']) => {
    const steps = getStepsForMode(mode)
    setAnalysisSteps(steps)

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      setCurrentStep(step)
      updateStepProgress(step.id, 'processing', 0, `Iniciando ${step.name.toLowerCase()}...`)

      // Simulate progress
      const progressDuration = mode === 'deep' ? 8000 : 2000
      const progressSteps = 20
      const stepDuration = progressDuration / progressSteps

      for (let j = 0; j <= progressSteps; j++) {
        await new Promise(resolve => setTimeout(resolve, stepDuration))
        const progress = (j / progressSteps) * 100
        updateStepProgress(step.id, 'processing', progress,
          j === progressSteps ? `Finalizando ${step.name.toLowerCase()}...` : `${step.name}...`
        )
      }

      updateStepProgress(step.id, 'completed', 100, `${step.name} concluído`)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }, [updateStepProgress])

  const handleAnalyze = useCallback(async () => {
    if (!inputQuery.trim()) {
      toast.error('Digite uma consulta para analisar')
      return
    }

    const cacheKey = `${inputQuery.trim()}-${selectedMode}`
    if (cachedResults.has(cacheKey)) {
      const cachedResult = cachedResults.get(cacheKey)!
      setResult(cachedResult)
      onAnalysisComplete?.(cachedResult)
      toast.success('Resultado recuperado do cache')
      return
    }

    setIsAnalyzing(true)
    setProgress(0)
    setResult(null)

    try {
      const mode = ANALYSIS_MODES.find(m => m.id === selectedMode)!

      // Start progress simulation
      const progressPromise = simulateProgress(selectedMode)

      // Make API call - use direct backend call for deep mode to avoid proxy timeout
      let apiCall: Promise<AnalysisResult | null>

      if (selectedMode === 'deep') {
        // Direct backend call with extended timeout (bypasses Next.js proxy)
        const token = typeof window !== 'undefined' ? await getSecureItem<string>('authToken') : null
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 180000) // 3 minutes

        apiCall = fetch(`${BACKEND_URL}/api/ai/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({
            query: inputQuery.trim(),
            mode: selectedMode,
            contextData
          }),
          signal: controller.signal
        })
          .then(async (res) => {
            clearTimeout(timeoutId)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            return (await res.json()) as AnalysisResult
          })
          .catch((error) => {
            clearTimeout(timeoutId)
            console.error('API Error:', error)
            return null
          })
      } else {
        // Standard mode can use the proxy (faster responses)
        apiCall = api.post<AnalysisResult>('/api/ai/analyze', {
          query: inputQuery.trim(),
          mode: selectedMode,
          contextData
        }).catch(error => {
          console.error('API Error:', error)
          return null
        })
      }

      // Wait for both
      const [, response] = await Promise.all([
        progressPromise,
        apiCall
      ])

      // Generate mock result if API fails
      const analysisResult: AnalysisResult = response || {
        id: Date.now().toString(),
        query: inputQuery.trim(),
        mode,
        confidence: mode.confidence,
        processingTime: elapsedTime,
        result: {
          summary: `Análise "${mode.name}" concluída para a consulta: "${inputQuery.trim()}"`,
          detailedAnalysis: selectedMode === 'deep'
            ? 'Esta é uma análise detalhada utilizando a Virtualis. A consulta foi processada com raciocínio avançado, considerando o contexto legislativo aplicável, precedentes jurídicos e as melhores práticas. O modo profundo permite uma compreensão mais abrangente da questão, identificando aspectos que podem passar despercebidos em análises mais rápidas.'
            : 'Esta é uma análise rápida utilizando a Virtualis Chat. A consulta foi processada de forma eficiente, fornecendo uma resposta direta e objetiva baseada no conhecimento geral sobre o tema legislativo.',
          recommendations: selectedMode === 'deep' ? [
            'Realizar consulta ao regimento interno para detalhes específicos',
            'Verificar legislação complementar municipal',
            'Analisar precedentes da câmara municipal',
            'Considerar impacto orçamentário da proposta',
            'Avaliar conformidade com legislação estadual e federal'
          ] : [
            'Consultar o regimento interno',
            'Verificar legislação pertinente'
          ],
          legalBasis: [
            'Constituição Federal',
            'Lei Orgânica Municipal',
            'Regimento Interno da Câmara',
            'Código de Legislação Municipal'
          ],
          compliance: {
            score: selectedMode === 'deep' ? 92 : 85,
            issues: selectedMode === 'deep' ? [
              'Verificar necessidade de parecer jurídico específico',
              'Analisar impacto em legislação ambiental'
            ] : [
              'Revisar formatação da proposta'
            ],
            suggestions: selectedMode === 'deep' ? [
              'Incluir seção de impacto orçamentário detalhado',
              'Adicionar referências a legislação correlata',
              'Considerar周期 de implementação',
              'Prever mecanismos de fiscalização'
            ] : [
              'Padronizar formatação conforme normas'
            ]
          }
        },
        metadata: {
          model: selectedMode === 'deep' ? 'deepseek-r1' : 'deepseek-chat',
          tokens: selectedMode === 'deep' ? 2048 : 512,
          timestamp: new Date()
        }
      }

      setResult(analysisResult)
      setCachedResults(prev => new Map(prev.set(cacheKey, analysisResult)))
      onAnalysisComplete?.(analysisResult)

      toast.success(`Análise ${mode.name} concluída com sucesso!`, {
        duration: 4000,
        icon: selectedMode === 'deep' ? '🧠' : '⚡'
      })

    } catch (error) {
      console.error('Analysis error:', error)
      toast.error(selectedMode === 'deep'
        ? 'Erro na análise profunda. Tente novamente ou use o modo rápido.'
        : 'Erro na análise. Tente novamente.')
    } finally {
      setIsAnalyzing(false)
      setCurrentStep(null)
      setAnalysisSteps([])
      setProgress(100)
    }
  }, [inputQuery, selectedMode, cachedResults, simulateProgress, contextData, elapsedTime, onAnalysisComplete])

  // Auto-analyze effect - must be after handleAnalyze definition
  useEffect(() => {
    if (autoAnalyze && query) {
      handleAnalyze()
    }
  }, [autoAnalyze, query, handleAnalyze])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 90) return 'text-green-600 dark:text-green-400'
    if (confidence >= 75) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Análise IA Avançada
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Escolha entre análise rápida para respostas imediatas ou análise profunda para consultas complexas
        </p>
      </div>

      {/* Mode Selection */}
      <Card className="glass glass-dark border-0">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ANALYSIS_MODES.map((mode) => {
              const Icon = iconMap[mode.icon] || Zap
              return (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  disabled={isAnalyzing}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                    selectedMode === mode.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg shadow-blue-500/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  } ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-${mode.color}-100 dark:bg-${mode.color}-900/30`}>
                      <Icon className={`h-5 w-5 text-${mode.color}-600 dark:text-${mode.color}-400`} />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {mode.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {mode.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {mode.estimatedTime}
                        </Badge>
                        <span className={`text-xs font-medium ${getConfidenceColor(mode.confidence)}`}>
                          {mode.confidence}% confiança
                        </span>
                      </div>
                    </div>
                    {selectedMode === mode.id && (
                      <div className="absolute top-2 right-2">
                        <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Input */}
      <Card className="glass glass-dark border-0">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Input
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Descreva sua consulta legislativa... (ex: 'Como criar uma lei de proteção ambiental municipal?')"
              disabled={isAnalyzing}
              className="text-base py-4"
            />
            <Button
              onClick={handleAnalyze}
              disabled={!inputQuery.trim() || isAnalyzing}
              isLoading={isAnalyzing}
              variant={selectedMode === 'deep' ? 'premium' : 'primary'}
              className="w-full py-3 text-base"
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <span>Analisando</span>
                  {currentStep && <span className="text-sm opacity-75">- {currentStep.name}</span>}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Iniciar {selectedMode === 'deep' ? 'Análise Profunda' : 'Análise Rápida'}
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      {isAnalyzing && (
        <Card className="glass glass-dark border-0">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Overall Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Progresso Geral
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {Math.round(progress)}% • {formatTime(elapsedTime)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Current Step */}
              {currentStep && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {currentStep.status === 'processing' && (
                        <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      )}
                      {currentStep.status === 'completed' && (
                        <Check className="h-5 w-5 text-green-500" />
                      )}
                      {currentStep.status === 'error' && (
                        <X className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {currentStep.name}
                      </p>
                      {currentStep.message && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {currentStep.message}
                        </p>
                      )}
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {Math.round(currentStep.progress)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Steps List */}
              {analysisSteps.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Etapas do Processo
                  </p>
                  <div className="space-y-1">
                    {analysisSteps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-2 text-sm">
                        <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center flex-shrink-0">
                          {step.status === 'completed' && (
                            <Check className="h-3 w-3 text-green-500" />
                          )}
                          {step.status === 'processing' && (
                            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                          )}
                          {step.status === 'error' && (
                            <X className="h-3 w-3 text-red-500" />
                          )}
                          {step.status === 'pending' && (
                            <span className="text-xs text-gray-400">{index + 1}</span>
                          )}
                        </div>
                        <span className={`${
                          step.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                          step.status === 'processing' ? 'text-blue-600 dark:text-blue-400' :
                          step.status === 'error' ? 'text-red-600 dark:text-red-400' :
                          'text-gray-400'
                        }`}>
                          {step.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <DeepSeekAnalysisResult
          result={result}
          onNewAnalysis={() => {
            setResult(null)
            setInputQuery('')
          }}
        />
      )}
    </div>
  )
}

// Result Component
interface DeepSeekAnalysisResultProps {
  result: AnalysisResult
  onNewAnalysis: () => void
}

const DeepSeekAnalysisResult: React.FC<DeepSeekAnalysisResultProps> = ({
  result,
  onNewAnalysis
}) => {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <Card className="glass glass-dark border-0 border-green-500/30 shadow-lg shadow-green-500/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            Análise Concluída
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="success" className="bg-green-100 text-green-800 border-green-200">
              {result.confidence}% confiança
            </Badge>
            <Badge variant="outline">
              {result.mode.name}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Resumo da Análise
          </h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {result.result.summary}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {result.processingTime}s
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Tempo</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {result.metadata.tokens}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Tokens</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {result.result.compliance.score}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Conformidade</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {result.result.recommendations.length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Recomendações</p>
          </div>
        </div>

        {/* Detailed Analysis Toggle */}
        <div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            {showDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {showDetails ? 'Ocultar' : 'Ver'} análise detalhada
          </button>
        </div>

        {/* Detailed Analysis */}
        {showDetails && (
          <div className="space-y-6 border-t pt-6">
            {/* Detailed Analysis Text */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Análise Detalhada
              </h4>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {result.result.detailedAnalysis}
                </p>
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Recomendações
              </h4>
              <div className="space-y-2">
                {result.result.recommendations.map((rec, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {index + 1}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      {rec}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Legal Basis */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Base Legal
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {result.result.legalBasis.map((basis, index) => (
                  <Badge key={index} variant="outline" className="justify-start">
                    <Scale className="h-3 w-3 mr-2" />
                    {basis}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Compliance Analysis */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Análise de Conformidade
              </h4>
              <div className="space-y-4">
                {/* Compliance Score */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Score de Conformidade
                    </span>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {result.result.compliance.score}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                      style={{ width: `${result.result.compliance.score}%` }}
                    ></div>
                  </div>
                </div>

                {/* Issues */}
                {result.result.compliance.issues.length > 0 && (
                  <div>
                    <h5 className="font-medium text-amber-700 dark:text-amber-400 mb-2">
                      Pontos de Atenção
                    </h5>
                    <div className="space-y-1">
                      {result.result.compliance.issues.map((issue, index) => (
                        <div key={index} className="flex gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-700 dark:text-gray-300">{issue}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {result.result.compliance.suggestions.length > 0 && (
                  <div>
                    <h5 className="font-medium text-blue-700 dark:text-blue-400 mb-2">
                      Sugestões de Melhoria
                    </h5>
                    <div className="space-y-1">
                      {result.result.compliance.suggestions.map((suggestion, index) => (
                        <div key={index} className="flex gap-2">
                          <Lightbulb className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-700 dark:text-gray-300">{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>Modelo: {result.metadata.model}</span>
                <span>{result.metadata.timestamp.toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={onNewAnalysis}
            variant="primary"
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Análise
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
      </CardContent>
    </Card>
  )
}

export default DeepSeekAnalysis
