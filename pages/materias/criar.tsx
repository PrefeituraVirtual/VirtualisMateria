import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { SEOHead } from '@/components/common/SEOHead'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { ArrowLeft, Search, Lightbulb, BrainCircuit, Sparkles, ArrowRight, FileText, AlertCircle } from 'lucide-react'
import { MATERIA_TYPES } from '@/lib/constants'
import { materiasService } from '@/lib/api'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { generateLegislativeSuggestion } from '@/lib/ai-service'
import toast from 'react-hot-toast'
import { materiaCreateSchema, materiaCreateFinalSchema, getZodErrors, MAX_TEMA_LENGTH, MAX_EMENTA_LENGTH, MAX_ASSUNTO_LENGTH } from '@/lib/validation'
import { z } from 'zod'
import { useCSRFToken } from '@/lib/csrf-protection'

export default function CriarMateriaPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isSearching, setIsSearching] = useState(false)
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [formData, setFormData] = useState({
    tipo: 'PJL' as const,
    tema: '',
    ementa: '',
    assunto: '',
    texto_original: '',
  })
  const [loadingText, setLoadingText] = useState('Processando...')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const { token: csrfToken } = useCSRFToken()

  const validateStep1 = (): boolean => {
    try {
      materiaCreateSchema.pick({ tipo: true, tema: true }).parse({
        tipo: formData.tipo,
        tema: formData.tema
      })
      setFieldErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        setFieldErrors(getZodErrors(error))
      }
      return false
    }
  }

  const validateStep3 = (): boolean => {
    try {
      materiaCreateFinalSchema.parse(formData)
      setFieldErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        setFieldErrors(getZodErrors(error))
      }
      return false
    }
  }

  const handleSearchTemplates = async () => {
    if (!validateStep1()) {
      toast.error('Por favor, corrija os erros no formulario')
      return
    }

    setIsSearching(true)
    try {
      // Buscar templates similares via API de busca semântica
      const response = await materiasService.search(formData.tema, 1, {
        filters: {
          tipo: formData.tipo,
          limit: 10
        }
      })
      
      toast.success(`Encontrados ${response.results.length} documentos similares!`)
      setStep(2)
    } catch (error) {
      console.error('Error searching templates:', error)
      toast.error('Erro ao buscar templates')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSuggestDetails = useCallback(async () => {
    setIsSuggesting(true)
    setLoadingText('Conectando ao servidor de IA...')

    const progressStages = [
      'Analisando o tema e contexto...',
      'Consultando legislacao existente...',
      'Verificando precedentes no Regimento...',
      'Buscando modelos de documentos similares...',
      'Redigindo a proposta final...'
    ]

    let stageIndex = 0
    const interval = setInterval(() => {
      stageIndex = (stageIndex + 1) % progressStages.length
      setLoadingText(progressStages[stageIndex])
    }, 5000)

    try {
      const suggestion = await generateLegislativeSuggestion(
        formData.tema,
        formData.tipo,
        {
          timeout: 180000, // 3 minutes for deep AI analysis
          onProgress: (stage) => {
            setLoadingText(stage)
          },
          onRetry: (attempt) => {
            toast.loading(`Reconectando ao servidor... (tentativa ${attempt + 1})`, {
              id: 'ai-retry',
              duration: 3000
            })
          }
        }
      )

      setFormData(prev => ({
        ...prev,
        ementa: suggestion.ementa || prev.ementa,
        assunto: suggestion.assunto || prev.assunto,
        texto_original: suggestion.texto_original || prev.texto_original
      }))

      toast.dismiss('ai-retry')
      toast.success('Sugestoes geradas com sucesso!')
      setStep(3)

    } catch (error: any) {
      console.error('Error getting AI suggestions:', error)

      const errorMessage = error.message || 'Erro desconhecido'

      if (errorMessage.includes('tempo limite') || errorMessage.includes('timeout')) {
        toast.error(
          'O servidor de IA demorou muito para responder. Tente novamente em alguns minutos.',
          { duration: 5000 }
        )
      } else if (errorMessage.includes('formato')) {
        toast.error(
          'A IA retornou uma resposta em formato inesperado. Tente novamente.',
          { duration: 5000 }
        )
        // Still advance to step 3 so user can fill manually
        setStep(3)
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        toast.error(
          'Erro de conexao com o servidor. Verifique sua conexao e tente novamente.',
          { duration: 5000 }
        )
      } else {
        toast.error(`Erro ao gerar sugestoes: ${errorMessage}`, { duration: 5000 })
      }
    } finally {
      clearInterval(interval)
      toast.dismiss('ai-retry')
      setIsSuggesting(false)
    }
  }, [formData.tema, formData.tipo])

  const handleCreateMateria = async () => {
    if (!validateStep3()) {
      toast.error('Por favor, corrija os erros no formulario')
      return
    }

    try {
      const dataWithCsrf = {
        ...formData,
        _csrf: csrfToken
      }

      const response = await materiasService.create(dataWithCsrf)
      toast.success('Matéria criada com sucesso!')
      router.push(`/materias/${response.data.id}/editar`)
    } catch (error) {
      console.error('Error creating materia:', error)
      toast.error('Erro ao criar matéria')
    }
  }

  return (
    <>
      <SEOHead
        title="Criar Nova Matéria Legislativa"
        description="Crie novos projetos de lei, indicações e documentos legislativos com assistência de IA"
        canonical="/materias/criar"
        noindex
      />

      <MainLayout>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6 pb-6 border-b-0 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-virtualis-gold-500/50 after:to-transparent">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Criar Nova Matéria Legislativa
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Use a IA para encontrar templates similares e criar seu documento
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center">
              {[1, 2, 3].map((s) => (
                <React.Fragment key={s}>
                  <div className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                        step >= s
                          ? 'bg-virtualis-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                      }`}
                    >
                      {s}
                    </div>
                    <span className={`ml-2 ${step >= s ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500'}`}>
                      {s === 1 && 'Tipo e Tema'}
                      {s === 2 && 'Busca IA'}
                      {s === 3 && 'Detalhes'}
                    </span>
                  </div>
                  {s < 3 && (
                    <div className={`w-16 h-1 mx-4 ${step > s ? 'bg-virtualis-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Step 1: Tipo e Tema */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>
                  Selecione o tipo de matéria e descreva o tema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo de Matéria *
                  </label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(val) => setFormData({ ...formData, tipo: val as typeof formData.tipo })}
                    aria-label="Tipo de matéria"
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(MATERIA_TYPES).map(([key, value]) => (
                        <SelectItem key={key} value={key}>{value.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Textarea
                    label="Tema da Matéria *"
                    value={formData.tema}
                    onChange={(e) => {
                      setFormData({ ...formData, tema: e.target.value })
                      if (fieldErrors.tema) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev }
                          delete newErrors.tema
                          return newErrors
                        })
                      }
                    }}
                    placeholder="Descreva o tema da sua matéria legislativa. Exemplo: 'Criação de programa de educação ambiental nas escolas municipais'"
                    rows={4}
                    maxLength={MAX_TEMA_LENGTH}
                    className={fieldErrors.tema ? 'border-red-500 focus:ring-red-500' : ''}
                  />
                  <div className="flex justify-between mt-1">
                    {fieldErrors.tema ? (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors.tema}
                      </p>
                    ) : (
                      <span></span>
                    )}
                    <span className={`text-xs ${formData.tema.length > MAX_TEMA_LENGTH * 0.8 ? 'text-amber-500' : 'text-gray-400'}`}>
                      {formData.tema.length}/{MAX_TEMA_LENGTH}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSearchTemplates}
                    disabled={!formData.tema.trim() || isSearching}
                    isLoading={isSearching}
                  >
                    {isSearching ? 'Buscando...' : 'Buscar Templates'}
                    <Search className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Resultados da Busca IA */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Templates Encontrados</CardTitle>
                <CardDescription>
                  A IA encontrou documentos similares baseados em seu tema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-virtualis-blue-50 dark:bg-virtualis-blue-900/20 border border-virtualis-blue-200 dark:border-virtualis-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-virtualis-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-virtualis-blue-900 dark:text-virtualis-blue-100">
                        IA está analisando documentos similares
                      </p>
                      <p className="text-sm text-virtualis-blue-700 dark:text-virtualis-blue-300 mt-1">
                        Encontramos documentos que podem servir de base para seu novo documento.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-1">
                   <div className="flex items-center gap-2 text-sm font-medium text-virtualis-blue-700 dark:text-virtualis-blue-300 bg-virtualis-blue-50 dark:bg-virtualis-blue-900/10 px-3 py-1.5 rounded-full border border-virtualis-blue-100 dark:border-virtualis-blue-800">
                    <BrainCircuit className="h-4 w-4" />
                    <span>Modo Virtualis com Raciocínio Ativo: Análise Legislativa Profunda (Alta Precisão)</span>
                   </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button
                    variant="ai"
                    onClick={handleSuggestDetails}
                    disabled={isSuggesting}
                  >
                    {isSuggesting ? (
                      <span className="flex items-center">
                        <span className="mr-2 animate-pulse">●</span>
                        {loadingText}
                      </span>
                    ) : (
                      <>
                        Gerar Documento com IA
                        <Sparkles className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setStep(3)}
                  >
                    Continuar Manualmente
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Detalhes Finais */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Detalhes da Matéria</CardTitle>
                <CardDescription>
                  Complete as informações para criar a matéria
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Input
                    label="Ementa *"
                    value={formData.ementa}
                    onChange={(e) => {
                      setFormData({ ...formData, ementa: e.target.value })
                      if (fieldErrors.ementa) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev }
                          delete newErrors.ementa
                          return newErrors
                        })
                      }
                    }}
                    placeholder="Resumo da matéria legislativa"
                    maxLength={MAX_EMENTA_LENGTH}
                    className={fieldErrors.ementa ? 'border-red-500 focus:ring-red-500' : ''}
                  />
                  <div className="flex justify-between mt-1">
                    {fieldErrors.ementa ? (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors.ementa}
                      </p>
                    ) : (
                      <span></span>
                    )}
                    <span className={`text-xs ${formData.ementa.length > MAX_EMENTA_LENGTH * 0.8 ? 'text-amber-500' : 'text-gray-400'}`}>
                      {formData.ementa.length}/{MAX_EMENTA_LENGTH}
                    </span>
                  </div>
                </div>

                <div>
                  <Textarea
                    label="Assunto"
                    value={formData.assunto}
                    onChange={(e) => {
                      setFormData({ ...formData, assunto: e.target.value })
                      if (fieldErrors.assunto) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev }
                          delete newErrors.assunto
                          return newErrors
                        })
                      }
                    }}
                    placeholder="Descrição detalhada do assunto (opcional)"
                    rows={6}
                    maxLength={MAX_ASSUNTO_LENGTH}
                    className={fieldErrors.assunto ? 'border-red-500 focus:ring-red-500' : ''}
                  />
                  <div className="flex justify-between mt-1">
                    {fieldErrors.assunto ? (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors.assunto}
                      </p>
                    ) : (
                      <span></span>
                    )}
                    <span className={`text-xs ${formData.assunto.length > MAX_ASSUNTO_LENGTH * 0.8 ? 'text-amber-500' : 'text-gray-400'}`}>
                      {formData.assunto.length}/{MAX_ASSUNTO_LENGTH}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleCreateMateria}
                    disabled={!formData.ementa.trim()}
                  >
                    Criar e Editar
                    <FileText className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </MainLayout>
    </>
  )
}
