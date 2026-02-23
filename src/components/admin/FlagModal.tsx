import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Flag, AlertTriangle, GraduationCap, Bug, HelpCircle } from 'lucide-react'
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'

export interface FlagData {
  /** Type of flag */
  flagType: string
  /** Optional notes */
  notes?: string
}

export interface FlagModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal closes */
  onClose: () => void
  /** Callback when flag is submitted */
  onSubmit: (data: FlagData) => Promise<void>
  /** Conversation ID being flagged */
  conversationId?: string
  /** Loading state */
  loading?: boolean
}

/**
 * Flag type options with descriptions
 */
const flagTypes = [
  {
    id: 'ml_training',
    label: 'Treinamento ML',
    description: 'Marcar para uso em treinamento de modelos',
    icon: GraduationCap,
    color: 'blue',
  },
  {
    id: 'quality_issue',
    label: 'Problema de Qualidade',
    description: 'Resposta incorreta ou de baixa qualidade',
    icon: AlertTriangle,
    color: 'amber',
  },
  {
    id: 'bug_report',
    label: 'Bug ou Erro',
    description: 'Comportamento inesperado do sistema',
    icon: Bug,
    color: 'red',
  },
  {
    id: 'review_needed',
    label: 'Revisao Necessaria',
    description: 'Precisa de analise mais detalhada',
    icon: HelpCircle,
    color: 'purple',
  },
]

/**
 * FlagModal Component
 * Modal for flagging conversations with type selection and notes
 */
export function FlagModal({
  isOpen,
  onClose,
  onSubmit,
  conversationId,
  loading = false,
}: FlagModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedType(null)
      setNotes('')
    }
  }, [isOpen])

  // Handle submit
  const handleSubmit = async () => {
    if (!selectedType) return

    setSubmitting(true)
    try {
      await onSubmit({
        flagType: selectedType,
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (error) {
      console.error('Error flagging conversation:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // Get color classes for flag type
  const getColorClasses = (color: string, selected: boolean) => {
    const colors: Record<string, { border: string; bg: string; icon: string }> = {
      blue: {
        border: selected ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700',
        bg: selected ? 'bg-blue-50 dark:bg-blue-900/20' : '',
        icon: 'text-blue-600 dark:text-blue-400',
      },
      amber: {
        border: selected ? 'border-amber-500' : 'border-gray-200 dark:border-gray-700',
        bg: selected ? 'bg-amber-50 dark:bg-amber-900/20' : '',
        icon: 'text-amber-600 dark:text-amber-400',
      },
      red: {
        border: selected ? 'border-red-500' : 'border-gray-200 dark:border-gray-700',
        bg: selected ? 'bg-red-50 dark:bg-red-900/20' : '',
        icon: 'text-red-600 dark:text-red-400',
      },
      purple: {
        border: selected ? 'border-purple-500' : 'border-gray-200 dark:border-gray-700',
        bg: selected ? 'bg-purple-50 dark:bg-purple-900/20' : '',
        icon: 'text-purple-600 dark:text-purple-400',
      },
    }
    return colors[color] || colors.blue
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <ModalHeader>
        <ModalTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-amber-600" />
          Marcar Conversa
        </ModalTitle>
        <ModalDescription>
          Selecione o tipo de marcacao para esta conversa
          {conversationId && (
            <span className="text-gray-400"> (ID: {conversationId})</span>
          )}
        </ModalDescription>
      </ModalHeader>

      {/* Flag Type Selection */}
      <div className="space-y-3 mb-6">
        {flagTypes.map((type) => {
          const selected = selectedType === type.id
          const colors = getColorClasses(type.color, selected)

          return (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={cn(
                'w-full p-4 rounded-xl border-2 text-left transition-all',
                colors.border,
                colors.bg,
                'hover:bg-gray-50 dark:hover:bg-gray-800/50'
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'p-2 rounded-lg',
                    selected ? 'bg-white dark:bg-gray-900' : 'bg-gray-100 dark:bg-gray-800'
                  )}
                >
                  <type.icon className={cn('h-5 w-5', colors.icon)} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {type.label}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {type.description}
                  </p>
                </div>
                {selected && (
                  <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Observacoes (opcional)
        </label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Adicione observacoes sobre esta marcacao..."
          rows={3}
        />
      </div>

      {/* Footer */}
      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={submitting || loading}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!selectedType || submitting || loading}
        >
          {submitting ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Marcando...
            </>
          ) : (
            <>
              <Flag className="h-4 w-4 mr-2" />
              Marcar Conversa
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
