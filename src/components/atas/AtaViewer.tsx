import React, { useState, useCallback, useEffect } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  FileX, Info, RefreshCw, ExternalLink, FileText, FileCheck, MessageSquare, Users,
  ListChecks, Download, Edit2, CheckCircle, Calendar, Circle
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { sanitizeHtml } from '@/lib/markdown-sanitizer'
import { getSecureItem } from '@/lib/secure-storage'
import {
  Ata,
  SessionType,
  AtaStatus,
  SESSION_TYPES,
  ATA_STATUSES
} from '@/types/ata'

// Map of icon names for dynamic lookups
const iconMap: Record<string, LucideIcon> = {
  Calendar, Circle, FileText, FileCheck
}

// PDF Viewer Component with error handling
interface PdfViewerProps {
  ataId: number
  onError?: () => void
}

function PdfViewer({ ataId, onError }: PdfViewerProps) {
  const [pdfStatus, setPdfStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [token, setToken] = useState<string>('')

  // Get token from secure storage for iframe auth
  useEffect(() => {
    const loadToken = async () => {
      if (typeof window !== 'undefined') {
        const storedToken = await getSecureItem<string>('authToken')
        setToken(storedToken || '')
      }
    }
    loadToken()
  }, [])

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
  const pdfUrl = `${baseUrl}/api/atas/${ataId}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`

  // Check if PDF is available before showing iframe
  React.useEffect(() => {
    const checkPdfAvailability = async () => {
      try {
        const response = await fetch(pdfUrl, { method: 'HEAD' })
        if (response.ok) {
          setPdfStatus('loaded')
        } else {
          const contentType = response.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            // Try to get error message
            const errorResponse = await fetch(pdfUrl)
            const errorData = await errorResponse.json()
            setErrorMessage(errorData.error || 'Arquivo não disponível')
          } else {
            setErrorMessage('Arquivo PDF não encontrado no servidor')
          }
          setPdfStatus('error')
          onError?.()
        }
      } catch {
        setErrorMessage('Não foi possível conectar ao servidor')
        setPdfStatus('error')
        onError?.()
      }
    }

    setPdfStatus('loading')
    checkPdfAvailability()
  }, [ataId, pdfUrl, onError])

  const handleRetry = useCallback(() => {
    setPdfStatus('loading')
    setErrorMessage('')
    // Re-trigger the effect
    const checkPdfAvailability = async () => {
      try {
        const response = await fetch(pdfUrl, { method: 'HEAD' })
        if (response.ok) {
          setPdfStatus('loaded')
        } else {
          setErrorMessage('Arquivo PDF não encontrado no servidor')
          setPdfStatus('error')
        }
      } catch {
        setErrorMessage('Não foi possível conectar ao servidor')
        setPdfStatus('error')
      }
    }
    checkPdfAvailability()
  }, [pdfUrl])

  if (pdfStatus === 'error') {
    const isProductionFileError = errorMessage?.includes('não está disponível') || errorMessage?.includes('not found')

    return (
      <div className="w-full h-[300px] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
        <FileX className="h-16 w-16 text-gray-400 mb-4" />
        <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
          PDF não disponível
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md mb-2">
          {errorMessage || 'O arquivo PDF desta ata não está disponível no momento.'}
        </p>
        {isProductionFileError ? (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-4 max-w-md">
            <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
              <Info className="h-4 w-4 inline mr-1" />
              Os arquivos PDF estão armazenados no servidor de produção.
              Para visualizar, é necessário fazer deploy da aplicação ou configurar acesso remoto aos arquivos.
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center max-w-md mb-4">
            Isso pode ocorrer se o arquivo ainda não foi gerado ou houve um problema de conexão.
          </p>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  if (pdfStatus === 'loading') {
    return (
      <div className="w-full h-[300px] flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-virtualis-blue-600 mb-3"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Verificando PDF...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <iframe
        src={pdfUrl}
        className="w-full h-[500px] rounded-lg border border-gray-200 dark:border-gray-700"
        title="Visualização do PDF da Ata"
      />
      <div className="flex justify-end">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-virtualis-blue-600 hover:text-virtualis-blue-700 flex items-center gap-1"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir em nova aba
        </a>
      </div>
    </div>
  )
}

interface AtaViewerProps {
  ata: Ata | null
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
  onEdit?: (ata: Ata) => void
  onPublish?: (ata: Ata) => void
  onApprove?: (ata: Ata) => void
  onExportPdf?: (ata: Ata) => void
}

/**
 * AtaViewer Component
 *
 * Modal component for viewing detailed information about an ata.
 * Displays session info, participants, agenda items, and full content.
 */
export function AtaViewer({
  ata,
  isOpen,
  isLoading,
  onClose,
  onEdit,
  onPublish: _onPublish,
  onApprove,
  onExportPdf
}: AtaViewerProps) {
  if (!isOpen) return null

  const getStatusBadgeVariant = (status: AtaStatus): 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline' => {
    switch (status) {
      case 'APR':
        return 'success'
      case 'EV':
        return 'warning'
      case 'AGLV':
        return 'info'
      case 'CAD':
        return 'outline'
      default:
        return 'default'
    }
  }

  const getSessionBadgeClass = (type: SessionType): string => {
    switch (type) {
      case 'SO':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'SX':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  const formatDateTime = (dateStr: string, timeStr?: string) => {
    try {
      const date = parseISO(dateStr)
      let formatted = format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
      if (timeStr) {
        formatted += ` as ${timeStr}`
      }
      return formatted
    } catch {
      return dateStr
    }
  }

  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName]
    return Icon ? <Icon className="h-4 w-4" /> : null
  }

  // Map API response to component properties
  const sessionType = ata?.sessao?.tipo || ata?.sessionType || 'SO'
  const status = ata?.situacao || ata?.status || 'CAD'
  const sessionNumber = ata?.sessao?.numero || ata?.sessionNumber || 0
  const sessionDate = ata?.sessao?.data || ata?.sessionDate || ''
  const title = ata?.titulo || ata?.title || ''
  const summary = ata?.observacao || ata?.summary || ''
  const arquivo = ata?.arquivo || null

  const sessionConfig = SESSION_TYPES[sessionType as SessionType] || null
  const statusConfig = ATA_STATUSES[status as AtaStatus] || null

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
      <ModalHeader>
        <ModalTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-virtualis-blue-600" />
          {isLoading ? 'Carregando...' : 'Detalhes da Ata'}
        </ModalTitle>
      </ModalHeader>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-virtualis-blue-600"></div>
          </div>
        ) : ata ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge className={cn('text-sm', getSessionBadgeClass(sessionType as SessionType))}>
                  {getIcon(sessionConfig?.icon || 'Calendar')}
                  <span className="ml-1">{sessionConfig?.label || sessionType}</span>
                </Badge>
                <Badge variant={getStatusBadgeVariant(status as AtaStatus)}>
                  {getIcon(statusConfig?.icon || 'Circle')}
                  <span className="ml-1">{statusConfig?.label || status}</span>
                </Badge>
                <Badge variant="outline">Sessão #{sessionNumber}</Badge>
              </div>

              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {title}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Data da Sessão</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {formatDateTime(sessionDate)}
                  </p>
                </div>
                {arquivo && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Arquivo PDF</p>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                      <FileCheck className="h-4 w-4" />
                      Disponível para download
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* PDF Viewer */}
            {arquivo && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documento da Ata
                </h3>
                <PdfViewer ataId={ata.id} />
              </div>
            )}

            {/* Summary/Observação */}
            {summary && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Observações
                </h3>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-md">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {summary}
                  </p>
                </div>
              </div>
            )}

            {/* Participants */}
            {ata.participants && ata.participants.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Participantes ({ata.participants.length})
                </h3>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800 border-b-0 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-virtualis-gold-500/50 after:to-transparent">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nome</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Funcao</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Presenca</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {ata.participants.map((participant) => (
                        <tr key={participant.id} className="border-b-0 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-virtualis-gold-500/50 after:to-transparent last:after:hidden hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{participant.name}</td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{participant.role}</td>
                          <td className="px-4 py-2 text-center">
                            {participant.present ? (
                              <Badge variant="success" size="sm">Presente</Badge>
                            ) : (
                              <Badge variant="error" size="sm">Ausente</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Agenda Items */}
            {ata.agendaItems && ata.agendaItems.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  Pauta ({ata.agendaItems.length} itens)
                </h3>
                <div className="space-y-2">
                  {ata.agendaItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 rounded-md"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-virtualis-blue-100 dark:bg-virtualis-blue-900/30 text-virtualis-blue-600 dark:text-virtualis-blue-400 rounded-full flex items-center justify-center text-xs font-semibold">
                          {item.order}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{item.title}</p>
                          {item.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                          )}
                          {item.votingResult && (
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={item.votingResult.approved ? 'success' : 'error'} size="sm">
                                {item.votingResult.approved ? 'Aprovado' : 'Rejeitado'}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {item.votingResult.favor} a favor | {item.votingResult.against} contra | {item.votingResult.abstention} abstencoes
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full Content */}
            {ata.content && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Conteudo Completo
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-md max-h-96 overflow-y-auto">
                  <div
                    className="prose dark:prose-invert max-w-none text-sm"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(ata.content.replace(/\n/g, '<br/>'))
                    }}
                  />
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex flex-wrap gap-4">
                {ata.createdAt && (
                  <span>Criado em: {format(parseISO(ata.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                )}
                {ata.updatedAt && (
                  <span>Atualizado em: {format(parseISO(ata.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                )}
                {ata.publishedAt && (
                  <span>Publicado em: {format(parseISO(ata.publishedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">Nao foi possivel carregar os detalhes.</p>
        )}
      </div>

      <ModalFooter>
        <div className="flex flex-wrap gap-2 justify-end w-full">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>

          {ata && onExportPdf && (
            <Button variant="outline" onClick={() => onExportPdf(ata)}>
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          )}

          {ata && onEdit && status !== 'APR' && (
            <Button variant="outline" onClick={() => onEdit(ata)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}

          {ata && onApprove && (status === 'EV' || status === 'AGLV') && (
            <Button variant="primary" onClick={() => onApprove(ata)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprovar
            </Button>
          )}
        </div>
      </ModalFooter>
    </Modal>
  )
}

export default AtaViewer
