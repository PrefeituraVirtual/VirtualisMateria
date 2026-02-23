import React, { useState, useEffect, useCallback } from 'react'
import {
  AdminLayout,
  ConversationFilters,
  ConversationFiltersState,
  ConversationList,
  Conversation,
  Message,
  FlagModal,
  FlagData,
} from '@/components/admin'
import { adminService } from '@/lib/api'
import toast from 'react-hot-toast'

/**
 * Conversations Audit Page
 * Admin page for reviewing, filtering, and managing AI conversations
 */
export default function ConversationsAuditPage() {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [filters, setFilters] = useState<ConversationFiltersState>({
    search: '',
    userId: '',
    dateFrom: '',
    dateTo: '',
  })

  // Flag modal state
  const [flagModalOpen, setFlagModalOpen] = useState(false)
  const [flaggingConversationId, setFlaggingConversationId] = useState<string | null>(
    null
  )

  // Load conversations
  const loadConversations = useCallback(async () => {
    setLoading(true)
    try {
      const response = await adminService.getConversations({
        page,
        limit: pageSize,
        userId: filters.userId || undefined,
        search: filters.search || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      })

      if (response?.success) {
        // Suportar ambos os formatos (novo e legado)
        const conversationsData = response.data || (response as any).conversations || []
        const mapped: Conversation[] = conversationsData.map(
          (conv: any) => ({
            id: conv.id,
            userId: conv.user_id || conv.userId,
            userName: conv.user_name || conv.userName,
            title: conv.title,
            messageCount: conv.message_count || conv.messageCount || 0,
            createdAt: conv.created_at || conv.createdAt,
            updatedAt: conv.updated_at || conv.updatedAt,
            flagged: (conv.flagCount || conv.flag_count || 0) > 0,
            flagType: conv.flagType || conv.flag_type,
          })
        )
        setConversations(mapped)
        // Total is inside pagination object from backend
        const paginationData = response.pagination as { total?: number } | undefined
        setTotalCount(paginationData?.total || mapped.length)
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
      toast.error('Erro ao carregar conversas')
      setConversations([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filters])

  // Initial load and reload on filter/page changes
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Handle filter changes
  const handleFiltersChange = (newFilters: ConversationFiltersState) => {
    setFilters(newFilters)
    setPage(1) // Reset to first page when filters change
  }

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  // Load messages for a conversation
  const handleLoadMessages = async (id: string): Promise<Message[]> => {
    try {
      const response = await adminService.getConversation(id)
      // api.get returns response.data directly, so response IS the data
      const responseData = response as { messages?: any[] }
      if (responseData?.messages) {
        return responseData.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp || msg.created_at || msg.createdAt,
          metadata: msg.metadata,
        }))
      }
      return []
    } catch (error) {
      console.error('Error loading messages:', error)
      toast.error('Erro ao carregar mensagens')
      return []
    }
  }

  // Handle delete conversation
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conversa? Esta acao nao pode ser desfeita.')) {
      return
    }

    try {
      await adminService.deleteConversation(id)
      toast.success('Conversa excluida com sucesso')
      loadConversations() // Reload list
    } catch (error) {
      console.error('Error deleting conversation:', error)
      toast.error('Erro ao excluir conversa')
    }
  }

  // Handle flag conversation
  const handleFlag = (id: string) => {
    setFlaggingConversationId(id)
    setFlagModalOpen(true)
  }

  // Submit flag
  const handleFlagSubmit = async (data: FlagData) => {
    if (!flaggingConversationId) return

    try {
      await adminService.flagConversation(flaggingConversationId, data)
      toast.success('Conversa marcada com sucesso')
      loadConversations() // Reload to show updated flag status
    } catch (error) {
      console.error('Error flagging conversation:', error)
      toast.error('Erro ao marcar conversa')
      throw error // Re-throw to let modal handle it
    }
  }

  // Handle export
  const handleExport = async (format: 'csv' | 'json') => {
    setExportLoading(true)
    try {
      const response = await adminService.exportConversations(
        {
          userId: filters.userId || undefined,
          search: filters.search || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
        },
        format
      )

      // Create download
      const blob = format === 'csv'
        ? (response as Blob)
        : new Blob(
            [JSON.stringify((response as { data?: unknown }).data ?? response, null, 2)],
            { type: 'application/json' }
          )
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `conversas-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success(`Exportacao ${format.toUpperCase()} concluida`)
    } catch (error) {
      console.error('Error exporting:', error)
      toast.error('Erro ao exportar conversas')
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <AdminLayout
      title="Auditoria de Conversas"
      description="Visualize e gerencie conversas do assistente IA"
    >
      <div className="space-y-6">
        {/* Filters */}
        <ConversationFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onExport={handleExport}
          exportLoading={exportLoading}
        />

        {/* Conversation List */}
        <ConversationList
          conversations={conversations}
          totalCount={totalCount}
          page={page}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onLoadMessages={handleLoadMessages}
          onDelete={handleDelete}
          onFlag={handleFlag}
          loading={loading}
        />

        {/* Flag Modal */}
        <FlagModal
          isOpen={flagModalOpen}
          onClose={() => {
            setFlagModalOpen(false)
            setFlaggingConversationId(null)
          }}
          onSubmit={handleFlagSubmit}
          conversationId={flaggingConversationId || undefined}
        />
      </div>
    </AdminLayout>
  )
}
