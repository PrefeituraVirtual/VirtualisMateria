import React, { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Search,
  Send,
  Loader2,
} from 'lucide-react'

/**
 * Props for QueryInput component
 */
export interface QueryInputProps {
  /** Callback when query is submitted */
  onSubmit: (query: string) => void
  /** Loading state while processing */
  loading?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Initial query value */
  initialValue?: string
  /** Additional className */
  className?: string
}

/**
 * QueryInput Component
 * Natural language input for data analysis queries
 */
export function QueryInput({
  onSubmit,
  loading = false,
  disabled = false,
  placeholder = 'Faça uma pergunta sobre os dados legislativos...',
  initialValue = '',
  className,
}: QueryInputProps) {
  const [query, setQuery] = useState(initialValue)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      const trimmedQuery = query.trim()
      if (trimmedQuery && !loading && !disabled) {
        onSubmit(trimmedQuery)
      }
    },
    [query, loading, disabled, onSubmit]
  )

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Submit on Enter (without Shift for multiline)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  /**
   * Auto-resize textarea based on content
   */
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }, [query])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Input Container */}
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={cn(
            'relative rounded-xl border transition-all duration-200',
            'bg-white dark:bg-gray-900',
            isFocused
              ? 'border-virtualis-blue-500 ring-2 ring-virtualis-blue-500/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {/* Search Icon */}
          <div className="absolute left-4 top-4 text-gray-400 dark:text-gray-500">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-virtualis-blue-500" />
            ) : (
              <Search className="h-5 w-5" />
            )}
          </div>

          {/* Textarea Input */}
          <textarea
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled || loading}
            rows={1}
            className={cn(
              'w-full pl-12 pr-14 py-4 rounded-xl resize-none',
              'bg-transparent text-gray-900 dark:text-gray-100',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:outline-none focus:ring-0 border-none shadow-none',
              'disabled:cursor-not-allowed'
            )}
            aria-label="Query input"
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!query.trim() || loading || disabled}
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2',
              'p-2 rounded-lg transition-all duration-200',
              query.trim() && !loading && !disabled
                ? 'bg-virtualis-blue-600 text-white hover:bg-virtualis-blue-700 shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            )}
            aria-label="Submit query"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* Keyboard hint */}
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-right">
          Pressione <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400 font-mono text-[10px]">Enter</kbd> para enviar
        </p>
      </form>
    </div>
  )
}
