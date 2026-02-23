import { cn } from '@/lib/utils'

interface CharacterCounterProps {
  current: number
  max: number
  className?: string
}

export function CharacterCounter({ current, max, className }: CharacterCounterProps) {
  const percentage = (current / max) * 100
  const isWarning = percentage > 80
  const isDanger = percentage > 95

  return (
    <span
      className={cn(
        'text-xs',
        isDanger ? 'text-red-500 font-medium' : isWarning ? 'text-amber-500' : 'text-gray-400',
        className
      )}
    >
      {current}/{max}
    </span>
  )
}
