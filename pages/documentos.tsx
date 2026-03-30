
import React, { useState, useEffect, useCallback } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { SEOHead } from '@/components/common/SEOHead'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal'
import {
  RefreshCw, Loader2, FileStack, Sparkles, FileText, Plus, ChevronLeft, ChevronRight,
  Download, Trash2, FileQuestion, Award, FileBarChart, File
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Icon map for dynamic icon lookup in document types
const docIconMap: Record<string, LucideIcon> = {
  FileText, FileQuestion, Award, FileBarChart, File
}
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'

interface Document {
  id: string
  title: string
  type: string
  created_at: string
  has_content: boolean
}

interface DocumentsResponse {
  data: Document[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function DocumentosPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await api.get<DocumentsResponse>('/api/documents', {
        params: {
          page: pagination.page,
          limit: pagination.limit
        }
      })
      
      if (response && response.data) {
        setDocuments(response.data)
        if (response.pagination) {
          setPagination(response.pagination)
        }
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
      toast.error('Erro ao carregar documentos')
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.limit])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleDownload = async (doc: Document) => {
    try {
      const response = await api.get<Blob>(`/api/documents/${doc.id}/download`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(response)
      const link = document.createElement('a')
      link.href = url
      // Use title as filename or default
      const filename = `${doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success('Download iniciado')
    } catch (error) {
      console.error('Error downloading:', error)
      toast.error('Erro ao baixar documento')
    }
  }

  const handleDelete = (id: string, title: string) => {
    setDeleteTarget({ id, title })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/api/documents/${deleteTarget.id}`)
      toast.success('Documento excluído com sucesso')
      setDeleteTarget(null)
      fetchDocuments()
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Erro ao excluir documento')
    }
  }

  const getDocIcon = (type: string) => {
    const typeLower = type?.toLowerCase() || ''
    if (typeLower.includes('projeto') || typeLower.includes('lei')) return 'FileText'
    if (typeLower.includes('requerimento')) return 'FileQuestion'
    if (typeLower.includes('moção') || typeLower.includes('mocao')) return 'Award'
    if (typeLower.includes('relatório') || typeLower.includes('relatorio')) return 'FileBarChart'
    return 'File'
  }

  return (
    <MainLayout>
      <SEOHead title="Meus Documentos" description="Gerencie e organize seus documentos gerados pela IA e arquivos salvos." />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Meus Documentos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gerencie e organize seus documentos gerados pela IA e arquivos salvos.
          </p>
        </div>

        <Card className="glass glass-dark border-0">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Meus Arquivos</CardTitle>
                <CardDescription>
                  {pagination.total} documento{pagination.total !== 1 ? 's' : ''} encontrado{pagination.total !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              <Button onClick={() => fetchDocuments()} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && documents.length === 0 ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-4" />
                <p className="text-gray-500">Carregando documentos...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="bg-gray-50 dark:bg-gray-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileStack className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Nenhum arquivo gerado
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
                  Esta área armazena <strong>documentos gerados pela IA</strong> (como relatórios, resumos e análises exportadas).
                  <br/><br/>
                  Se você procura seus <strong>Projetos de Lei</strong> em tramitação, eles estão na área de Matérias.
                </p>
                <div className="flex flex-col gap-3 justify-center sm:flex-row flex-wrap">
                  <Button onClick={() => window.location.href = '/chatbot'} variant="ai">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar com Inteligência Artificial
                  </Button>
                  
                  <Button onClick={() => window.location.href = '/materias'} variant="outline" className="border-blue-200 hover:bg-blue-50 text-blue-700 dark:border-blue-800 dark:hover:bg-blue-900/20 dark:text-blue-400">
                    <FileText className="h-4 w-4 mr-2" />
                    Ver Minhas Matérias
                  </Button>

                  <Button onClick={() => window.location.href = '/materias/criar'} variant="ghost" className="text-gray-600 dark:text-gray-400">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Nova Matéria Legislativa
                  </Button>
                </div>
              </div>
            ) : (
              <>
              {/* Desktop: tabela */}
              <div className="hidden sm:block relative overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 font-medium">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg">Nome</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3 text-right rounded-r-lg">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {documents.map((doc) => {
                      const IconName = getDocIcon(doc.type)
                      const Icon = docIconMap[IconName] || File

                      return (
                        <tr key={doc.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1 max-w-xs md:max-w-md">
                                  {doc.title || 'Sem título'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="default" size="sm">{doc.type}</Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {formatDate(doc.created_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {doc.has_content && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownload(doc)}
                                  className="h-8 w-8 p-0"
                                  title="Baixar"
                                >
                                  <Download className="h-4 w-4 text-gray-500 hover:text-blue-500 transition-colors" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(doc.id, doc.title)}
                                className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500 transition-colors" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cards */}
              <div className="sm:hidden space-y-3">
                {documents.map((doc) => {
                  const IconName = getDocIcon(doc.type)
                  const Icon = docIconMap[IconName] || File

                  return (
                    <div key={doc.id} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 flex-shrink-0">
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100 break-words line-clamp-2">
                          {doc.title || 'Sem título'}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <Badge variant="default" size="sm">{doc.type}</Badge>
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                      <div className="flex gap-2 justify-end">
                        {doc.has_content && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(doc)}
                            className="h-8 w-8 p-0"
                            title="Baixar"
                          >
                            <Download className="h-4 w-4 text-gray-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(doc.id, doc.title)}
                          className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-gray-500" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
              </>
            )}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 dark:border-gray-800 pt-4 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Anterior</span>
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="hidden sm:inline">Página </span>{pagination.page}/{pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.totalPages || isLoading}
                >
                  <span className="hidden sm:inline">Próxima</span>
                  <ChevronRight className="h-4 w-4 ml-1 sm:ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <ModalHeader>
          <ModalTitle>Excluir documento</ModalTitle>
          <ModalDescription>
            Tem certeza que deseja excluir &quot;{deleteTarget?.title}&quot;? Esta ação não pode ser desfeita.
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
          <Button variant="danger" onClick={confirmDelete}>Excluir</Button>
        </ModalFooter>
      </Modal>
    </MainLayout>
  )
}
