import React from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Check, Calendar, FileText, Eye, Edit2, Trash2, Circle, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import {
  AtaSummary,
  SessionType,
  AtaStatus,
  SESSION_TYPES,
  ATA_STATUSES
} from '@/types/ata'

// Map of icon names for dynamic lookups
const iconMap: Record<string, LucideIcon> = {
  Calendar, FileText, Check, Circle, Eye, Edit2
}

interface AtaCardProps {
  ata: AtaSummary
  onView: (ata: AtaSummary) => void
  onEdit?: (ata: AtaSummary) => void
  onDelete?: (ata: AtaSummary) => void
  isSelected?: boolean
  onSelect?: (ata: AtaSummary) => void
}

/**
 * AtaCard Component
 *
 * Displays a summary card for a legislative session ata (minutes).
 * Shows session type, date, status, and quick action buttons.
 */
export function AtaCard({
  ata,
  onView,
  onEdit,
  onDelete,
  isSelected = false,
  onSelect
}: AtaCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  // Map API response to component properties
  const sessionType = ata.sessao?.tipo || ata.sessionType || 'SO'
  const status = ata.situacao || ata.status || 'CAD'
  const sessionNumber = ata.sessao?.numero || ata.sessionNumber || 0
  const sessionDate = ata.sessao?.data || ata.sessionDate || ''
  const title = ata.titulo || ata.title || ''
  const summary = ata.observacao || ata.summary || ''

  const sessionConfig = SESSION_TYPES[sessionType as SessionType]
  const statusConfig = ATA_STATUSES[status as AtaStatus]

  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName]
    return Icon ? <Icon className="h-4 w-4" /> : null
  }

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

  const formatSessionDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr)
      return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    } catch {
      return dateStr
    }
  }

  return (
    <Card
      className={cn(
        'transition-all duration-300 overflow-hidden',
        isSelected
          ? 'border-virtualis-blue-500 ring-2 ring-virtualis-blue-500/20 bg-virtualis-blue-50/5'
          : 'hover:border-virtualis-blue-500/30'
      )}
    >
      <div 
        className="flex items-start justify-between gap-3 p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Checkbox for Selection */}
          {onSelect && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSelect(ata)
              }}
              className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0',
                isSelected
                  ? 'bg-virtualis-blue-500 border-virtualis-blue-500 text-white'
                  : 'border-gray-300 dark:border-gray-600 hover:border-virtualis-blue-400'
              )}
              aria-label={isSelected ? 'Desmarcar ata' : 'Selecionar ata'}
            >
              {isSelected && <Check className="h-3 w-3" />}
            </button>
          )}

          {/* Expanded State Indicator Icon */}
           <div className={cn("transition-transform duration-200", isExpanded ? "rotate-180" : "")}>
              <ChevronDown className="h-5 w-5 text-gray-400" />
           </div>

          {/* Quick Info (Always Visible) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
             <Badge className={cn('text-xs shrink-0', getSessionBadgeClass(sessionType as SessionType))}>
                {getIcon(sessionConfig?.icon || 'Calendar')}
                <span className="ml-1">{sessionConfig?.label || sessionType}</span>
              </Badge>

              <Badge variant={getStatusBadgeVariant(status as AtaStatus)} size="sm" className="shrink-0">
                {getIcon(statusConfig?.icon || 'Circle')}
                <span className="ml-1">{statusConfig?.label || status}</span>
              </Badge>

             <span className="min-w-0 break-words text-xs font-medium text-gray-900 dark:text-gray-100 sm:text-sm">
               {sessionNumber}ª Sessão - {formatSessionDate(sessionDate)}
             </span>
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 pt-0 border-t border-gray-100 dark:border-gray-800/50 bg-gray-50/30 dark:bg-gray-900/10">
               <div className="pt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 min-w-0">
                      {/* Full Title */}
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {title}
                      </h3>

                      {/* Summary */}
                      {summary && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
                          {summary}
                        </p>
                      )}
                      
                      {ata.arquivo && (
                        <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                          <FileText className="h-3 w-3" />
                          PDF Oficial disponível
                        </span>
                      )}
                  </div>

                  {/* Actions */}
                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onView(ata)
                      }}
                      className="w-full justify-center hover:border-virtualis-blue-500/50 hover:text-virtualis-blue-600 sm:w-auto"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Visualizar
                    </Button>

                    {onEdit && status !== 'APR' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit(ata)
                        }}
                        className="w-full justify-center hover:border-yellow-500/50 hover:text-yellow-600 sm:w-auto"
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    )}

                    {onDelete && status === 'CAD' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(ata)
                        }}
                        className="w-full justify-center hover:border-red-500/50 hover:text-red-600 sm:w-auto"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    )}
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

export default AtaCard
