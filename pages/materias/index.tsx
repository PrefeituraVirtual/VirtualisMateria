import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { SEOHead } from '@/components/common/SEOHead'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader as _CardHeader, CardTitle as _CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Plus, Search, Eye, Edit, MoreVertical, Trash2, FileText, ChevronLeft, ChevronRight, Mic2 } from 'lucide-react'
import { MATERIA_TYPES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { materiasService } from '@/lib/api'
import toast from 'react-hot-toast'
import { Modal, ModalHeader, ModalFooter, ModalTitle, ModalDescription } from '@/components/ui/Modal'

export default function MateriasPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [materias, setMaterias] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  
  // Pagination State
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [totalCount, setTotalCount] = useState(0)

  // State for delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [materiaToDelete, setMateriaToDelete] = useState<string | null>(null)

  const loadMaterias = useCallback(async () => {
    try {
      setIsLoading(true)
      const offset = (page - 1) * limit
      const response = await materiasService.getAll({ 
        tipo: filterType !== 'all' ? filterType : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        limit,
        offset
      })
      setMaterias(response.data || [])
      setTotalCount(response.count || 0)
    } catch (error) {
      console.error('Error loading materias:', error)
      toast.error('Erro ao carregar matérias')
    } finally {
      setIsLoading(false)
    }
  }, [filterType, filterStatus, page, limit])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [filterType, filterStatus])

  useEffect(() => {
    loadMaterias()

    // Close menu when clicking outside
    const handleClickOutside = () => setActiveMenuId(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [loadMaterias])

  const confirmDelete = (id: string) => {
    setMateriaToDelete(id)
    setDeleteModalOpen(true)
    setActiveMenuId(null) // Close the dropdown
  }

  const handleDelete = async () => {
    if (!materiaToDelete) return

    try {
      await materiasService.delete(materiaToDelete)
      toast.success('Matéria excluída com sucesso')
      loadMaterias() // Refresh list
    } catch (error) {
      console.error('Error deleting materia:', error)
      toast.error('Erro ao excluir matéria')
    } finally {
      setDeleteModalOpen(false)
      setMateriaToDelete(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { label: 'Rascunho', variant: 'default' as const },
      em_tramitacao: { label: 'Em Tramitação', variant: 'info' as const },
      aprovado: { label: 'Aprovado', variant: 'success' as const },
      rejeitado: { label: 'Rejeitado', variant: 'error' as const },
      arquivado: { label: 'Arquivado', variant: 'warning' as const },
    }
    const config = statusMap[status as keyof typeof statusMap] || statusMap.draft
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <>
      <SEOHead
        title="Matérias Legislativas"
        description="Consulte e gerencie projetos de lei, indicações, moções e outros documentos legislativos"
        canonical="/materias"
      />

      <MainLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* ... existing header and filters ... */}
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b-0 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-virtualis-gold-500/50 after:to-transparent">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Matérias Legislativas
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Gerencie suas matérias legislativas
              </p>
            </div>
            <Link href="/materias/criar">
              <Button variant="primary" size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Nova Matéria
              </Button>
            </Link>
          </div>

          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Buscar matérias..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<Search className="h-5 w-5 text-gray-400" />}
                />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-virtualis-blue-500"
                >
                  <option value="all">Todos os tipos</option>
                  {Object.entries(MATERIA_TYPES).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-virtualis-blue-500"
                >
                  <option value="all">Todos os status</option>
                  <option value="draft">Rascunho</option>
                  <option value="em_tramitacao">Em Tramitação</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="rejeitado">Rejeitado</option>
                  <option value="arquivado">Arquivado</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-virtualis-blue-600"></div>
            </div>
          )}

          {/* Lista de Matérias */}
          {!isLoading && materias.length > 0 && (
            <div className="grid grid-cols-1 gap-4">
              {materias.map((materia) => {
                const tipoConfig = MATERIA_TYPES[materia.tipo as keyof typeof MATERIA_TYPES] || { label: materia.tipo, variant: 'default' }
                return (
                  <Card key={materia.id} hover className="cursor-pointer relative overflow-visible">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0" onClick={() => setActiveMenuId(null)}>
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="info" className="flex-shrink-0">
                              {tipoConfig.label} {materia.numero}
                            </Badge>
                            {getStatusBadge(materia.status)}
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            {materia.ementa}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Criada em {formatDate(materia.created_at)}
                          </p>
                        </div>
                        <div className="flex gap-2 isolate">
                          <Link href={`/materias/${materia.id}`}>
                            <Button variant="outline" size="sm" title="Visualizar">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/materias/${materia.id}/editar`}>
                            <Button variant="outline" size="sm" title="Editar">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          
                          <div className="relative">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === materia.id ? null : materia.id);
                              }}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                            
                            {activeMenuId === materia.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/discursos?materiaId=${materia.id}`);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center transition-colors"
                                >
                                  <Mic2 className="h-4 w-4 mr-2" />
                                  Gerar Discurso
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    confirmDelete(materia.id);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center transition-colors"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {/* Pagination Controls */}
              {totalCount > limit && (
                <div className="flex items-center justify-between py-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, totalCount)} de {totalCount} resultados
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Anterior
                    </Button>
                    <div className="flex items-center px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm font-medium">
                      Página {page} de {Math.ceil(totalCount / limit)}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= Math.ceil(totalCount / limit)}
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && materias.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Nenhuma matéria encontrada
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Comece criando sua primeira matéria legislativa
                  </p>
                  <Link href="/materias/criar">
                    <Button variant="primary">
                      <Plus className="h-5 w-5 mr-2" />
                      Criar primeira matéria
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
          <ModalHeader>
            <ModalTitle>Excluir Matéria</ModalTitle>
            <ModalDescription>
              Tem certeza que deseja excluir esta matéria? Esta ação não pode ser desfeita e removerá permanentemente o documento do sistema.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-500" 
              onClick={handleDelete}
            >
              Excluir Matéria
            </Button>
          </ModalFooter>
        </Modal>
      </MainLayout>
    </>
  )
}
