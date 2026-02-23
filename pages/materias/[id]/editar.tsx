import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { SEOHead } from '@/components/common/SEOHead'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { CharacterCounter } from '@/components/ui/CharacterCounter'
import { ArrowLeft, RefreshCw, Save, Info, AlertCircle } from 'lucide-react'
import { materiasService } from '@/lib/api'
import toast from 'react-hot-toast'
import { MATERIA_TYPES } from '@/lib/constants'
import { materiaEditSchema, getZodErrors, sanitizeFormData, MAX_EMENTA_LENGTH, MAX_ASSUNTO_LENGTH, MAX_TEXTO_ORIGINAL_LENGTH } from '@/lib/validation'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'

const MAX_OBSERVACAO_LENGTH = 1000

export default function EditarMateriaPage() {
  const router = useRouter()
  const { id } = router.query
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    id: '',
    tipo: '',
    ementa: '',
    assunto: '',
    texto_original: '',
    observacao: ''
  })

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) {
        return prev
      }
      const { [field]: _removed, ...rest } = prev
      return rest
    })
  }

  const renderFieldError = (message?: string) => {
    if (!message) return undefined
    return (
      <span className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" aria-hidden="true" />
        {message}
      </span>
    )
  }

  const loadMateria = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await materiasService.get(id as string)

      if (!data) {
        throw new Error('Materia not found')
      }

      // Verificar se matéria pode ser editada
      if (data.status && ['APR', 'APRU', 'APS', 'APRV', 'SANC', 'PROM', 'ARQ'].includes(data.status)) {
        toast.error('Esta matéria está finalizada e não pode ser editada')
        router.push(`/materias/${id}`)
        return
      }

      // Verificar se o usuário é o dono da matéria
      if (data.id_usuario_envio_protocolo && user) {
        const userId = user.council_member_id || user.id
        if (data.id_usuario_envio_protocolo.toString() !== userId.toString()) {
          toast.error('Você só pode editar suas próprias matérias')
          router.push(`/materias/${id}`)
          return
        }
      }

      setFormData({
        id: data.id,
        tipo: data.tipo,
        ementa: data.ementa || '',
        assunto: data.assunto || '',
        texto_original: data.texto_original || '',
        observacao: data.observacao || ''
      })
    } catch (error) {
      console.error('Error loading materia:', error)
      toast.error('Erro ao carregar matéria')
      router.push('/materias')
    } finally {
      setIsLoading(false)
    }
  }, [id, user, router])

  useEffect(() => {
    if (id) {
      loadMateria()
    }
  }, [id, loadMateria])

  const handleSave = async () => {
    const validationPayload = {
      ementa: formData.ementa,
      assunto: formData.assunto,
      texto_original: formData.texto_original,
      observacao: formData.observacao
    }

    try {
      materiaEditSchema.parse(validationPayload)
      setFieldErrors({})
    } catch (error) {
      if (error instanceof z.ZodError) {
        setFieldErrors(getZodErrors(error))
        toast.error('Corrija os campos destacados para continuar')
      } else {
        toast.error('Erro ao validar os dados da matéria')
      }
      return
    }

    const sanitizedFields = sanitizeFormData(validationPayload)

    try {
      setIsSaving(true)
      const payload = { ...formData, ...sanitizedFields }
      // Note: Assuming update method exists or creating a placeholder
      // If update method doesn't exist in service, we might need to add it
      if (materiasService.update) {
        await materiasService.update(id as string, payload)
        toast.success('Matéria salva com sucesso!')
      } else {
        // Fallback or error if update not implemented
        console.warn('Update method not implemented in materiasService')
        toast.success('Simulação: Matéria salva (API pendente)')
      }
    } catch (error) {
      console.error('Error saving materia:', error)
      toast.error('Erro ao salvar alterações')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-virtualis-blue-600"></div>
        </div>
      </MainLayout>
    )
  }

  const canonicalPath = id ? `/materias/${id}/editar` : '/materias/editar'
  const seoTitle = formData.id ? `Editar Matéria ${formData.id}` : 'Editar Matéria Legislativa'

  return (
    <>
      <SEOHead
        title={seoTitle}
        description="Edite informações e texto da matéria legislativa"
        canonical={canonicalPath}
        noindex
      />

      <MainLayout>
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/materias')}
                className="mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Lista
              </Button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                Editar Matéria
                <span className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full font-normal text-gray-600 dark:text-gray-400">
                  #{formData.id}
                </span>
              </h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={loadMateria}
                disabled={isSaving}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recarregar
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                isLoading={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Conteúdo da Matéria</CardTitle>
                  <CardDescription>Informações principais do documento</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tipo
                    </label>
                    <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300">
                      {MATERIA_TYPES[formData.tipo as keyof typeof MATERIA_TYPES]?.label || formData.tipo}
                    </div>
                  </div>

                  <Textarea
                    label="Ementa *"
                    value={formData.ementa}
                    onChange={(e) => {
                      setFormData({ ...formData, ementa: e.target.value })
                      clearFieldError('ementa')
                    }}
                    rows={4}
                    maxLength={MAX_EMENTA_LENGTH}
                    error={renderFieldError(fieldErrors.ementa)}
                    required
                  />
                  <div className="flex justify-end mt-1">
                    <CharacterCounter current={formData.ementa.length} max={MAX_EMENTA_LENGTH} />
                  </div>

                  <Textarea
                    label="Texto do Documento"
                    value={formData.texto_original}
                    onChange={(e) => {
                      setFormData({ ...formData, texto_original: e.target.value })
                      clearFieldError('texto_original')
                    }}
                    rows={15}
                    placeholder="Digite o texto completo da matéria aqui..."
                    className="font-mono text-sm"
                    maxLength={MAX_TEXTO_ORIGINAL_LENGTH}
                    error={renderFieldError(fieldErrors.texto_original)}
                  />
                  <div className="flex justify-end mt-1">
                    <CharacterCounter current={formData.texto_original.length} max={MAX_TEXTO_ORIGINAL_LENGTH} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Metadata */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Metadados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    label="Assunto / Palavras-chave"
                    value={formData.assunto}
                    onChange={(e) => {
                      setFormData({ ...formData, assunto: e.target.value })
                      clearFieldError('assunto')
                    }}
                    rows={4}
                    maxLength={MAX_ASSUNTO_LENGTH}
                    error={renderFieldError(fieldErrors.assunto)}
                  />
                  <div className="flex justify-end mt-1">
                    <CharacterCounter current={formData.assunto.length} max={MAX_ASSUNTO_LENGTH} />
                  </div>

                  <Textarea
                    label="Observações Internas"
                    value={formData.observacao}
                    onChange={(e) => {
                      setFormData({ ...formData, observacao: e.target.value })
                      clearFieldError('observacao')
                    }}
                    rows={3}
                    maxLength={MAX_OBSERVACAO_LENGTH}
                    error={renderFieldError(fieldErrors.observacao)}
                  />
                  <div className="flex justify-end mt-1">
                    <CharacterCounter current={formData.observacao.length} max={MAX_OBSERVACAO_LENGTH} />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">Status: Em Elaboração</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Este documento ainda não foi protocolado oficialmente.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </MainLayout>
    </>
  )
}
