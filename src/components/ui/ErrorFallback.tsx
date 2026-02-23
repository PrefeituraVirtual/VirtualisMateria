import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type ErrorFallbackVariant = 'inline' | 'page' | 'modal'

interface ErrorFallbackProps {
  error?: Error | string | null
  resetError?: () => void
  title?: string
  description?: string
  showDetails?: boolean
  variant?: ErrorFallbackVariant
  className?: string
}

export function ErrorFallback({
  error,
  resetError,
  title = 'Algo deu errado',
  description,
  showDetails = false,
  variant = 'inline',
  className,
}: ErrorFallbackProps) {
  const isDev = process.env.NODE_ENV === 'development'
  const errorMessage = typeof error === 'string' ? error : error?.message
  const details = typeof error === 'string' ? error : error?.stack || error?.message
  const baseDescription = description || errorMessage || 'Nao foi possivel concluir esta operacao.'

  const variantClasses: Record<ErrorFallbackVariant, string> = {
    inline: 'rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-900/10 p-4',
    page: 'min-h-[60vh] rounded-2xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-gray-900 p-8',
    modal: 'rounded-2xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-gray-900 p-6',
  }

  return (
    <div className={cn('w-full', variantClasses[variant], className)}>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{baseDescription}</p>
        </div>
      </div>

      {resetError && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={resetError}>
            Tentar Novamente
          </Button>
        </div>
      )}

      {showDetails && isDev && details && (
        <div className="mt-4">
          <details className="rounded-lg border border-red-200/60 dark:border-red-900/40 bg-white/70 dark:bg-gray-900/50 p-3 text-xs text-gray-600 dark:text-gray-400">
            <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">
              Detalhes tecnicos
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-relaxed">
              {details}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}

export default ErrorFallback
