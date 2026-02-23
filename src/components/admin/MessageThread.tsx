import React from 'react'
import { cn } from '@/lib/utils'
import { User, Bot, Clock } from 'lucide-react'
import { SafeMarkdown } from '@/lib/markdown-sanitizer'

export interface Message {
  /** Message ID */
  id: string
  /** Role: user or assistant */
  role: 'user' | 'assistant'
  /** Message content */
  content: string
  /** Timestamp */
  timestamp: string
  /** Message metadata */
  metadata?: {
    mode?: string
    model?: string
    tokens?: number
  }
}

export interface MessageThreadProps {
  /** Array of messages */
  messages: Message[]
  /** Additional className */
  className?: string
}

/**
 * MessageThread Component
 * Displays a conversation thread with user and assistant messages
 */
export function MessageThread({ messages, className }: MessageThreadProps) {
  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  if (messages.length === 0) {
    return (
      <div className={cn('p-6 text-center text-gray-500 dark:text-gray-400', className)}>
        Nenhuma mensagem nesta conversa
      </div>
    )
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = []
  let currentDate = ''

  messages.forEach((message) => {
    const date = formatDate(message.timestamp)
    if (date !== currentDate) {
      currentDate = date
      groupedMessages.push({ date, messages: [message] })
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(message)
    }
  })

  return (
    <div className={cn('space-y-6', className)}>
      {groupedMessages.map((group, groupIndex) => (
        <div key={groupIndex}>
          {/* Date Separator */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {group.date}
            </span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Messages */}
          <div className="space-y-4">
            {group.messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'flex-row-reverse' : ''
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center',
                    message.role === 'user'
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : 'bg-purple-100 dark:bg-purple-900/30'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={cn(
                    'flex-1 max-w-[80%] p-4 rounded-2xl',
                    message.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm'
                  )}
                >
                  {/* Content */}
                  <div
                    className={cn(
                      'prose prose-sm max-w-none',
                      message.role === 'user'
                        ? '[&_*]:text-white'
                        : 'dark:prose-invert'
                    )}
                  >
                    <SafeMarkdown content={message.content} prose={false} />
                  </div>

                  {/* Footer */}
                  <div
                    className={cn(
                      'mt-2 flex items-center gap-3 text-xs',
                      message.role === 'user'
                        ? 'text-blue-100'
                        : 'text-gray-500 dark:text-gray-400'
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(message.timestamp)}
                    </div>
                    {message.metadata?.mode && (
                      <span className="px-1.5 py-0.5 bg-black/10 dark:bg-white/10 rounded">
                        {message.metadata.mode}
                      </span>
                    )}
                    {message.metadata?.tokens && (
                      <span>{message.metadata.tokens.toLocaleString()} tokens</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
