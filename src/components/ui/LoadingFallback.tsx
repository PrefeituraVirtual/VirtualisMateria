import React, { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface LoadingFallbackProps {
  message?: string
  timeout?: number
  onTimeout?: () => void
  showProgress?: boolean
  estimatedDurationMs?: number
  onCancel?: () => void
  cancelLabel?: string
  className?: string
}

export function LoadingFallback({
  message = 'Processando...',
  timeout = 120000,
  onTimeout,
  showProgress = false,
  estimatedDurationMs,
  onCancel,
  cancelLabel = 'Cancelar',
  className,
}: LoadingFallbackProps) {
  const [elapsedMs, setElapsedMs] = useState(0)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (!timeout) return
    const interval = setInterval(() => {
      setElapsedMs((prev) => prev + 1000)
    }, 1000)
    return () => clearInterval(interval)
  }, [timeout])

  useEffect(() => {
    if (!timeout || timedOut) return
    if (elapsedMs >= timeout) {
      setTimedOut(true)
      if (onTimeout) onTimeout()
    }
  }, [elapsedMs, onTimeout, timeout, timedOut])

  const progress = useMemo(() => {
    if (!showProgress || !estimatedDurationMs) return null
    return Math.min((elapsedMs / estimatedDurationMs) * 100, 100)
  }, [elapsedMs, estimatedDurationMs, showProgress])

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {timedOut ? 'Ainda processando, aguarde...' : message}
        </p>
      </div>

      {showProgress && (
        <div className="w-full">
          <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            {progress === null ? (
              <div className="h-full w-full animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
            ) : (
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            )}
          </div>
          {progress !== null && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
              {Math.round(progress)}%
            </p>
          )}
        </div>
      )}

      {timedOut && onCancel && (
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Se desejar, voce pode cancelar.</span>
          <Button variant="outline" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

export default LoadingFallback
