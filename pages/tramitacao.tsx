import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { SEOHead } from '@/components/common/SEOHead'
import { MainLayout } from '@/components/layout/MainLayout'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'
import {
  Edit3, FileText, Megaphone, Scale, Vote, Stamp, RefreshCw, Kanban,
  Lock, Printer, Archive
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Modal, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/Modal'

// --- TYPES ---
type KanbanStatus = 'DRAFT' | 'PROTOCOL' | 'READING' | 'COMMISSION' | 'VOTING' | 'SANCTION' | 'ARCHIVED'

interface KanbanCard {
  id: number
  title: string
  type: string
  status: KanbanStatus
  originalStatus: string
  date: string
  code: string
}

const COLUMNS: { id: KanbanStatus; label: string; icon: any; color: string }[] = [
  { id: 'DRAFT', label: 'Rascunho', icon: Edit3, color: 'bg-gray-200 text-gray-700' },
  { id: 'PROTOCOL', label: 'Protocolo', icon: FileText, color: 'bg-gray-100 text-gray-700' },
  { id: 'READING', label: 'Leitura', icon: Megaphone, color: 'bg-blue-100 text-blue-700' },
  { id: 'COMMISSION', label: 'Comissoes', icon: Scale, color: 'bg-yellow-100 text-yellow-700' },
  { id: 'VOTING', label: 'Votacao', icon: Vote, color: 'bg-purple-100 text-purple-700' },
  { id: 'SANCTION', label: 'Sancao', icon: Stamp, color: 'bg-green-100 text-green-700' },
  { id: 'ARCHIVED', label: 'Arquivado', icon: Archive, color: 'bg-red-100 text-red-700' },
]

interface MateriaDetail {
  id: number
  tipo: string
  ementa: string
  assunto: string
  observacao: string
  texto_original: string
  status: string
  chave_recibo: string
  created_at: string
  data_envio_protocolo: string
  id_usuario_envio_protocolo?: number
  nome_autor?: string
  email_autor?: string
}

interface KanbanResponse {
  success: boolean
  data: KanbanCard[]
}

export default function TramitacaoPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [cards, setCards] = useState<KanbanCard[]>([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [selectedMateria, setSelectedMateria] = useState<MateriaDetail | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)

  // Auth Protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  // Fetch Data with optional loading spinner control
  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      const response = await api.get<KanbanResponse>('/api/tramitacao')
      if (response.success) {
        setCards(response.data)
      }
    } catch (error) {
      console.error(error)
      if (showLoading) {
        toast.error('Erro ao carregar quadro')
      }
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [])

  // Initial fetch + 30s auto-refresh polling
  useEffect(() => {
    if (!user) return

    fetchData()

    const interval = setInterval(() => {
      // Silent polling -- no loading spinner
      fetchData(false)
    }, 30000)

    return () => clearInterval(interval)
  }, [user, fetchData])

  // Fetch Materia Details
  const handleCardClick = async (id: number) => {
    setModalLoading(true)
    setIsModalOpen(true)
    setSelectedMateria(null) // Reset previous
    try {
        const response = await api.get<{ success: boolean; data: MateriaDetail }>(`/api/tramitacao/${id}`)
        if (response.success) {
            setSelectedMateria(response.data)
        }
    } catch (error) {
        console.error(error)
        toast.error('Erro ao carregar detalhes')
        setIsModalOpen(false)
    } finally {
        setModalLoading(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedMateria(null)
  }

  if (authLoading || !user) return <div className="p-8">Carregando...</div>

  return (
    <MainLayout>
      <SEOHead
        title="Tramitacao de Materias"
        description="Acompanhe o andamento e tramitacao de materias legislativas"
      />

      <div className="h-[calc(100vh-100px)] flex flex-col">
        <header className="flex justify-between items-center mb-6 px-4">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Kanban className="h-6 w-6 text-blue-600" />
                    Tramitacao Legislativa
                </h1>
                <p className="text-gray-500">Acompanhe visualmente o progresso das materias.</p>
            </div>
            <Button onClick={() => fetchData(true)} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
            </Button>
        </header>

        {/* KANBAN BOARD -- Read-Only */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 pb-4">
            {loading ? (
                 <div className="flex h-full items-center justify-center min-w-[1400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                 </div>
            ) : (
                <div className="flex gap-4 h-full min-w-[1400px]">
                    {COLUMNS.map(column => (
                        <KanbanColumn
                            key={column.id}
                            column={column}
                            cards={cards.filter(c => c.status === column.id)}
                            onCardClick={handleCardClick}
                        />
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* READ ONLY MODAL */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <ModalHeader>
            <ModalTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                {modalLoading ? 'Carregando...' : selectedMateria?.tipo === 'PJL' ? 'Projeto de Lei' : selectedMateria?.tipo || 'Detalhes da Materia'}
            </ModalTitle>
        </ModalHeader>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
            {modalLoading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : selectedMateria ? (
                <>
                    {/* Header Info */}
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                         <div>
                            <p className="text-xs text-gray-500 uppercase">Protocolo</p>
                            <p className="font-medium">{selectedMateria.id}</p>
                         </div>
                         <div>
                            <p className="text-xs text-gray-500 uppercase">Data</p>
                            <p className="font-medium">{format(new Date(selectedMateria.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                         </div>
                         <div className="col-span-2">
                            <p className="text-xs text-gray-500 uppercase">Autor</p>
                            <p className="font-medium">{selectedMateria.nome_autor || 'Desconhecido'}</p>
                         </div>
                         <div className="col-span-2">
                             <div className="flex items-center gap-2 mt-2">
                                <Badge className={COLUMNS.find(c => c.id === cards.find(x => x.id === selectedMateria.id)?.status)?.color || 'bg-gray-100'}>
                                    {selectedMateria.status}
                                </Badge>
                                <Badge variant="outline">{selectedMateria.chave_recibo}</Badge>
                             </div>
                         </div>
                    </div>

                    {/* Ementa */}
                    <div>
                        <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Ementa</h3>
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-md shadow-sm">
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                {selectedMateria.ementa}
                            </p>
                        </div>
                    </div>

                    {/* Texto Original */}
                    {selectedMateria.texto_original && (
                        <div>
                            <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Texto Integral</h3>
                            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-md overflow-auto max-h-[400px]">
                                <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 dark:text-gray-200">
                                    {selectedMateria.texto_original}
                                </pre>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <p className="text-center text-gray-500">Nao foi possivel carregar os detalhes.</p>
            )}
        </div>

        <ModalFooter>
             {/* Only Close button - No Edit Actions */}
            <Button variant="outline" onClick={handleCloseModal}>
                Fechar
            </Button>
            {/* Print button */}
            <Button variant="ghost" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
            </Button>
        </ModalFooter>
      </Modal>
    </MainLayout>
  )
}

/** Read-only Kanban column -- no drag-and-drop handlers */
function KanbanColumn({ column, cards, onCardClick }: { column: typeof COLUMNS[number], cards: KanbanCard[], onCardClick: (id: number) => void }) {
    return (
        <div
            className="flex-1 flex flex-col rounded-xl border min-w-[280px] bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
        >
            {/* Column Header */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center sticky top-0 rounded-t-xl z-10 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center gap-2 font-semibold">
                     <div className={`p-1.5 rounded-md ${column.color} ${column.id === 'ARCHIVED' ? 'dark:bg-red-900/30 dark:text-red-400' : ''}`}>
                        <column.icon className="h-4 w-4" />
                     </div>
                     {column.label}
                </div>
                <Badge className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">{cards.length}</Badge>
            </div>

            {/* Cards Area */}
            <div className="flex-1 p-2 overflow-y-auto space-y-3 custom-scrollbar">
                {cards.map(card => (
                    <KanbanCardItem key={card.id} card={card} onClick={() => onCardClick(card.id)} />
                ))}
            </div>
        </div>
    )
}

/** Read-only Kanban card -- click to view details only, no drag or move actions */
function KanbanCardItem({ card, onClick }: { card: KanbanCard, onClick: () => void }) {
    const isFinalized = card.status === 'SANCTION' || card.status === 'ARCHIVED'

    return (
        <div
            className={`group relative bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 ${isFinalized ? 'opacity-75' : ''}`}
            onClick={onClick}
            title="Clique para ver detalhes"
        >
            {/* Card Header: code, DEVCORR badge, lock icon, date */}
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] h-5">{card.code}</Badge>
                    {card.originalStatus === 'DEVCORR' && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded">
                            Devolvido
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {isFinalized && <Lock className="h-3 w-3 text-gray-400" />}
                    <div className="text-[10px] text-gray-400">
                        {format(new Date(card.date), 'dd/MM')}
                    </div>
                </div>
            </div>

            <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 line-clamp-2 mb-2 select-none" title={card.title}>
                {card.title}
            </h4>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 dark:border-gray-700/50">
               <Badge className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-100 select-none">{card.type}</Badge>
            </div>
        </div>
    )
}
