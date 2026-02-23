import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConversationRow, Conversation } from './ConversationRow'
import { Message } from './MessageThread'

export interface ConversationListProps {
  /** Array of conversations */
  conversations: Conversation[]
  /** Total count for pagination */
  totalCount: number
  /** Current page */
  page: number
  /** Items per page */
  pageSize: number
  /** Callback when page changes */
  onPageChange: (page: number) => void
  /** Callback to load messages for a conversation */
  onLoadMessages: (id: string) => Promise<Message[]>
  /** Callback when delete is requested */
  onDelete: (id: string) => void
  /** Callback when flag is requested */
  onFlag: (id: string) => void
  /** Callback when view details is requested */
  onViewDetails?: (id: string) => void
  /** Loading state */
  loading?: boolean
  /** Additional className */
  className?: string
}

/**
 * ConversationList Component
 * Paginated list of expandable conversation rows
 */
export function ConversationList({
  conversations,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onLoadMessages,
  onDelete,
  onFlag,
  onViewDetails,
  loading = false,
  className,
}: ConversationListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loadingMessagesId, setLoadingMessagesId] = useState<string | null>(null)
  const [conversationMessages, setConversationMessages] = useState<
    Record<string, Message[]>
  >({})

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / pageSize)
  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalCount)

  // Handle message loading
  const handleLoadMessages = async (id: string) => {
    if (conversationMessages[id]) return

    setLoadingMessagesId(id)
    try {
      const messages = await onLoadMessages(id)
      setConversationMessages((prev) => ({
        ...prev,
        [id]: messages,
      }))
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoadingMessagesId(null)
    }
  }

  // Handle toggle expand
  const handleToggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 animate-pulse"
          >
            <div className="flex items-center gap-4">
              <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div
        className={cn(
          'p-12 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-center',
          className
        )}
      >
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
            <MessageSquare className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Nenhuma conversa encontrada
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Tente ajustar os filtros ou aguarde novas conversas
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Conversation Rows */}
      {conversations.map((conversation) => (
        <ConversationRow
          key={conversation.id}
          conversation={{
            ...conversation,
            messages: conversationMessages[conversation.id],
          }}
          expanded={expandedId === conversation.id}
          onToggle={() => handleToggle(conversation.id)}
          onLoadMessages={() => handleLoadMessages(conversation.id)}
          onDelete={() => onDelete(conversation.id)}
          onFlag={() => onFlag(conversation.id)}
          onViewDetails={onViewDetails ? () => onViewDetails(conversation.id) : undefined}
          loadingMessages={loadingMessagesId === conversation.id}
        />
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando {startItem} a {endItem} de {totalCount} conversas
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={cn(
                      'h-8 w-8 flex items-center justify-center rounded text-sm font-medium transition-colors',
                      page === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              Proxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
