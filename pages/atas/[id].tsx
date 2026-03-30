import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { MainLayout } from '@/components/layout/MainLayout'
import { SEOHead } from '@/components/common/SEOHead'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  ArrowLeft,
  FileText,
  Download,
  Printer,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  Brain,
  Database,
  Loader2,
  Trash2,
  Edit,
  Save,
  XCircle
} from 'lucide-react'
import { atasService } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

interface AtaAIData {
  id: string
  id_sessao: number
  transcription_job_id: string
  titulo: string
  numero_sessao: string
  tipo_sessao: string
  data_sessao: string
  structured_data: {
    header?: {
      sessao_numero?: string
      data?: string
      presentes_count?: number
      presentes?: string[]
    }
    ordem_dia?: {
      segunda_discussao?: Array<{
        projeto_numero?: string
        votacao?: {
          favoraveis?: number
          contrarios?: number
          total_votos?: number
        }
      }>
    }
  }
  official_text: string
  validation_result: {
    contagem_votos?: boolean
    warnings?: string[]
    errors?: string[]
  }
  db_validation_result: {
    projetos_validados?: boolean
    projetos_nao_encontrados?: string[]
  }
  status: string
  model_used: string
  tokens_used: number
  processing_time_seconds: number
  reviewed: boolean
  created_at: string
  updated_at: string
}

export default function AtaDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useIsAdmin()

  const [ataData, setAtaData] = useState<AtaAIData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [showValidations, setShowValidations] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  // const [isRegenerating, setIsRegenerating] = useState(false)
  // const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedText, setEditedText] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Auth Protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  // Fetch Ata Data
  useEffect(() => {
    const fetchAtaData = async () => {
      if (!id || typeof id !== 'string') return

      setIsLoading(true)
      try {
        const response = await atasService.getAIData(id as unknown as number)
        if (response.success && response.data) {
          setAtaData(response.data as unknown as AtaAIData)
        } else {
          toast.error('Ata não encontrada')
          router.push('/atas')
        }
      } catch (error) {
        console.error('Error fetching ata:', error)
        toast.error('Erro ao carregar ata')
        router.push('/atas')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAtaData()
  }, [id, router])

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    if (!ataData) return

    const blob = new Blob([ataData.official_text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ata-${ataData.numero_sessao}-${ataData.data_sessao}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Ata baixada com sucesso!')
  }

  const handleDeleteAIGenerated = async () => {
    if (!ataData) return
    if (!window.confirm('Tem certeza que deseja excluir esta ata gerada por IA?')) return

    setIsDeleting(true)
    try {
      await atasService.deleteAIGenerated(ataData.id)
      toast.success('Ata gerada removida com sucesso')
      router.push('/transcricao')
    } catch (error) {
      console.error('Error deleting AI-generated ata:', error)
      toast.error('Erro ao excluir ata gerada')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditClick = () => {
    if (!ataData) return
    setEditedText(ataData.official_text)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedText('')
  }

  const handleSaveEdit = async () => {
    if (!ataData) return

    setIsSaving(true)
    try {
      const result = await atasService.updateAIGenerated(ataData.id, editedText)
      
      // Update local state
      setAtaData({
        ...ataData,
        official_text: editedText,
        updated_at: result.data.updated_at
      })
      
      setIsEditing(false)
      toast.success('Texto da ata atualizado com sucesso')
    } catch (error) {
      console.error('Error updating ata text:', error)
      toast.error('Erro ao salvar alterações')
    } finally {
      setIsSaving(false)
    }
  }

  /* Functions hidden as the button is disabled per user request
  const handleRegenerateClick = () => {
    setConfirmModalOpen(true)
  }

  const handleRegenerateConfirm = async () => {
    if (!ataData) return
    setConfirmModalOpen(false)

    setIsRegenerating(true)
    try {
      const response = await atasService.regenerateAIGenerated(ataData.id)
      const newAtaId = (response as { ataId?: string }).ataId

      if (!newAtaId) {
        throw new Error('Resposta sem ID da nova ata')
      }

      toast.success('Ata regenerada com sucesso')
      router.replace(`/atas/${newAtaId}`)
    } catch (error) {
      console.error('Error regenerating AI-generated ata:', error)
      toast.error('Erro ao regenerar ata')
    } finally {
      setIsRegenerating(false)
    }
  }
  */

  if (authLoading || isLoading) {
    return (
      <MainLayout>
        <SEOHead title="Carregando Ata..." />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Carregando ata...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!ataData) {
    return (
      <MainLayout>
        <SEOHead title="Ata não encontrada" />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Ata não encontrada</p>
            <Button onClick={() => router.push('/atas')} className="mt-4">
              Voltar para Atas
            </Button>
          </div>
        </div>
      </MainLayout>
    )
  }

  const hasValidationIssues =
    ataData.validation_result?.warnings?.length ||
    ataData.validation_result?.errors?.length ||
    ataData.db_validation_result?.projetos_nao_encontrados?.length ||
    ataData.validation_result?.contagem_votos === false

  return (
    <MainLayout>
      <SEOHead
        title={`${ataData.titulo} - Ata Gerada por IA`}
        description={`Ata da ${ataData.numero_sessao} Sessão ${ataData.tipo_sessao} - ${ataData.data_sessao}`}
      />

      <div className="container mx-auto max-w-5xl px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 print:hidden">
          <Button
            variant="ghost"
            onClick={() => router.push('/transcricao')}
            className="mb-4 w-full justify-center sm:w-auto sm:justify-start"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
                  {ataData.titulo}
                </h1>
                {/* Badge removed per user request
                <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300">
                  <Brain className="h-3 w-3 mr-1" />
                  Gerada por IA
                </Badge>
                */}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(ataData.data_sessao).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>{ataData.numero_sessao} Sessão {ataData.tipo_sessao}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Processado em {ataData.processing_time_seconds}s</span>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 print:hidden sm:flex-row sm:flex-wrap xl:w-auto">
              <Button variant="outline" onClick={handlePrint} className="w-full justify-center sm:w-auto">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button variant="outline" onClick={handleDownload} className="w-full justify-center sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
              {isAdmin && !adminLoading && (
                <>
                  {!isEditing ? (
                    <Button
                      variant="outline"
                      onClick={handleEditClick}
                      className="w-full justify-center border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-800 dark:hover:bg-amber-900/20 sm:w-auto"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Texto
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="w-full justify-center sm:w-auto"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                        className="w-full justify-center bg-green-600 text-white hover:bg-green-700 sm:w-auto"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Salvar
                      </Button>
                    </>
                  )}

                  {!isEditing && (
                    <>
                      {/* Button hidden per user request, logic preserved
                      <Button
                        variant="outline"
                        onClick={handleRegenerateClick}
                        disabled={isRegenerating}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                      >
                        {isRegenerating ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Regenerar
                      </Button>
                      */}
                      <Button
                        variant="outline"
                        onClick={handleDeleteAIGenerated}
                        disabled={isDeleting}
                        className="w-full justify-center border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-900/20 sm:w-auto"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Excluir
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Validation Warnings */}
        {hasValidationIssues && showValidations && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 space-y-3 print:hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Avisos de Validação
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowValidations(!showValidations)}
              >
                {showValidations ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>

            {ataData.validation_result?.errors?.map((error, idx) => (
              <div
                key={`error-${idx}`}
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-red-900 dark:text-red-200">Erro</h4>
                    <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                  </div>
                </div>
              </div>
            ))}

            {ataData.validation_result?.warnings?.map((warning, idx) => (
              <div
                key={`warning-${idx}`}
                className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-200">Aviso</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-300">{warning}</p>
                  </div>
                </div>
              </div>
            ))}

            {ataData.db_validation_result?.projetos_nao_encontrados?.map((projeto, idx) => (
              <div
                key={`projeto-${idx}`}
                className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4"
              >
                <div className="flex items-start gap-2">
                  <Database className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-orange-900 dark:text-orange-200">
                      Projeto não encontrado
                    </h4>
                    <p className="text-sm text-orange-800 dark:text-orange-300">{projeto}</p>
                  </div>
                </div>
              </div>
            ))}

            {ataData.validation_result?.contagem_votos === false && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-red-900 dark:text-red-200">
                      Contagem de Votos Incorreta
                    </h4>
                    <p className="text-sm text-red-800 dark:text-red-300">
                      O total de votos não corresponde ao número de presentes. Revise a ata manualmente.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Official Text */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 print:border-none print:p-0 print:shadow-none sm:p-8">
          <div className="mb-4 flex flex-col gap-2 print:hidden sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-gray-100">
              <FileText className="h-5 w-5" />
              Texto Oficial da Ata
            </h2>
            {isEditing && (
               <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                 Modo de Edição
               </Badge>
            )}
          </div>
          <div className="prose dark:prose-invert max-w-none">
            {isEditing ? (
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="h-[60vh] w-full rounded-md border border-gray-300 p-4 font-serif text-sm leading-relaxed focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 sm:h-[500px]"
                placeholder="Edite o texto da ata aqui..."
              />
            ) : (
              <pre className="overflow-x-auto whitespace-pre-wrap break-words border-0 bg-transparent p-0 font-serif text-sm leading-relaxed text-gray-900 shadow-none dark:text-gray-100">
                {ataData.official_text}
              </pre>
            )}
          </div>
        </div>



        {/* AI Metadata */}
        <div className="mt-6 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400 print:hidden sm:gap-4">
          <div className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            <span>Modelo: {ataData.model_used}</span>
          </div>
          <div className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            <span>Tokens: {ataData.tokens_used.toLocaleString('pt-BR')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Gerado em: {new Date(ataData.created_at).toLocaleString('pt-BR')}</span>
          </div>
          {ataData.reviewed && (
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Revisado</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal removed as the button is disabled per user request */}
    </MainLayout>
  )
}
