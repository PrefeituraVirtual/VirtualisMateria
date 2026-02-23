import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  User,
  Clock,
  Trash2,
  Flag,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MessageThread, Message } from './MessageThread'

export interface Conversation {
  /** Conversation ID */
  id: string
  /** User ID */
  userId: string | number
  /** User name */
  userName?: string
  /** Conversation title */
  title?: string
  /** Total messages count */
  messageCount: number
  /** Creation date */
  createdAt: string
  /** Last update date */
  updatedAt: string
  /** Messages (loaded when expanded) */
  messages?: Message[]
  /** Flag status */
  flagged?: boolean
  /** Flag type if flagged */
  flagType?: string
}

export interface ConversationRowProps {
  /** Conversation data */
  conversation: Conversation
  /** Whether the row is expanded */
  expanded?: boolean
  /** Callback when expand/collapse is toggled */
  onToggle: () => void
  /** Callback when messages need to be loaded */
  onLoadMessages: () => Promise<void>
  /** Callback when delete is requested */
  onDelete: () => void
  /** Callback when flag is requested */
  onFlag: () => void
  /** Callback when view details is requested */
  onViewDetails?: () => void
  /** Loading state for messages */
  loadingMessages?: boolean
  /** Additional className */
  className?: string
}

/**
 * ConversationRow Component
 * Expandable row displaying conversation summary and messages when expanded
 */
export function ConversationRow({
  conversation,
  expanded = false,
  onToggle,
  onLoadMessages,
  onDelete,
  onFlag,
  onViewDetails,
  loadingMessages = false,
  className,
}: ConversationRowProps) {
  const [messagesLoaded, setMessagesLoaded] = useState(false)

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Handle expand click
  const handleExpandClick = async () => {
    if (!expanded && !messagesLoaded && !loadingMessages) {
      await onLoadMessages()
      setMessagesLoaded(true)
    }
    onToggle()
  }

  return (
    <div
      className={cn(
        'border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900 transition-all',
        expanded && 'ring-2 ring-blue-500/20',
        className
      )}
    >
      {/* Summary Row */}
      <div
        className={cn(
          'p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
          expanded && 'bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800'
        )}
        onClick={handleExpandClick}
      >
        <div className="flex items-center gap-4">
          {/* Expand/Collapse Icon */}
          <div className="flex-shrink-0">
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3 min-w-[200px]">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {conversation.userName || `Usuario #${conversation.userId}`}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ID: {conversation.userId}
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
              {conversation.title || 'Sem titulo'}
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {conversation.messageCount} mensagens
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(conversation.updatedAt)}
              </span>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-2">
            {conversation.flagged && (
              <span className="px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                {conversation.flagType || 'Marcada'}
              </span>
            )}
          </div>

          {/* Actions */}
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {onViewDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewDetails}
                className="text-gray-500 hover:text-gray-700"
                title="Ver detalhes"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onFlag}
              className={cn(
                'text-gray-500 hover:text-amber-600',
                conversation.flagged && 'text-amber-600'
              )}
              title="Marcar conversa"
            >
              <Flag className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-gray-500 hover:text-red-600"
              title="Excluir conversa"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-4 bg-gray-50 dark:bg-gray-950 max-h-[500px] overflow-y-auto">
          {loadingMessages ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversation.messages && conversation.messages.length > 0 ? (
            <MessageThread messages={conversation.messages} />
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Nenhuma mensagem encontrada
            </div>
          )}
        </div>
      )}
    </div>
  )
}
