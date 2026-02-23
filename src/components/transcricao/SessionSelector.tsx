import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Search, RefreshCw, X, Database, ChevronDown, Loader2, Calendar, Check, Youtube,
  CircleStop, FileAudio, ChevronLeft, ChevronRight, CheckCircle, Link, Mic, Clock
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { transcriptionService } from '@/lib/api'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { SessionsParams, TranscriptionJob } from '@/types/api'

// Map of icon names for dynamic status icons
const statusIconMap: Record<string, LucideIcon> = {
  Clock, Loader2, Check, X
}

/**
 * Interface for session data from the database
 */
export interface SessionForTranscription {
  id: number
  numero: number
  data: string
  tipo: 'SO' | 'SX'
  urlTransmissao: string
  legislatura?: {
    id: number
    numero: number
  }
  transcricao?: Pick<TranscriptionJob, 'id' | 'status'> | null
}

/**
 * Interface for legislatura dropdown options
 */
interface Legislatura {
  id: number
  numero: number
  dataInicio?: string
  dataFinal?: string
}

/**
 * Interface for pagination
 */
interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

/**
 * Props for the SessionSelector component
 */
interface SessionSelectorProps {
  onStartTranscription: (session: SessionForTranscription, segmented: boolean) => Promise<void>
  onCancelTranscription: (jobId: string) => Promise<void>
  isLoading: boolean
}

/**
 * Configuration for session types
 */
const SESSION_TYPES = {
  SO: { label: 'Sessao Ordinaria', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  SX: { label: 'Sessao Extraordinaria', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' }
}

/**
 * Configuration for transcription status
 */
const TRANSCRIPTION_STATUS = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: 'Clock' },
  processing: { label: 'Processando', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: 'Loader2' },
  completed: { label: 'Transcrita', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: 'Check' },
  failed: { label: 'Falhou', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: 'X' }
}

/**
 * SessionSelector Component
 *
 * Allows users to select sessions from the database to transcribe.
 * Features:
 * - Search by session number
 * - Filter by session type (SO/SX)
 * - Filter by year
 * - Filter by legislatura
 * - Filter by transcription status
 * - Pagination
 * - Visual selection with preview
 */
export function SessionSelector({ onStartTranscription, onCancelTranscription, isLoading }: SessionSelectorProps) {
  // State for sessions data
  const [sessions, setSessions] = useState<SessionForTranscription[]>([])
  const [legislaturas, setLegislaturas] = useState<Legislatura[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isSessionsListOpen, setIsSessionsListOpen] = useState(true)

  // State for filters
  const [search, setSearch] = useState('')
  const [tipo, setTipo] = useState<'all' | 'SO' | 'SX'>('all')
  const [ano, setAno] = useState<number | undefined>(undefined)
  const [legislaturaId, setLegislaturaId] = useState<number | undefined>(undefined)
  const [transcricaoStatus, setTranscricaoStatus] = useState<'all' | 'transcrita' | 'pendente'>('pendente')

  // State for selection
  const [selectedSession, setSelectedSession] = useState<SessionForTranscription | null>(null)

  // Generate year options (current year and 10 years back)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - i)

  /**
   * Fetch available sessions from the API
   */
  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true)
    try {
      const params: SessionsParams = {
        page: pagination.page,
        limit: pagination.limit
      }

      if (search) params.search = search
      if (tipo !== 'all') params.tipo = tipo
      if (ano) params.ano = ano
      if (legislaturaId) params.legislatura = legislaturaId
      if (transcricaoStatus !== 'all') params.transcricaoStatus = transcricaoStatus

      const response = await transcriptionService.getAvailableSessions(params)

      if (response.success) {
        const sessionsData = Array.isArray(response.data)
          ? (response.data as SessionForTranscription[])
          : []
        setSessions(sessionsData)

        const paginationData = (response as { pagination?: Pagination }).pagination
        if (paginationData) {
          setPagination(prev => ({
            ...prev,
            total: paginationData.total || 0,
            totalPages: paginationData.totalPages || 0
          }))
        }
      } else {
        const errorMessage = (response as { error?: string }).error
        toast.error(errorMessage || 'Erro ao buscar sessoes')
      }
    } catch (error: unknown) {
      console.error('Error fetching sessions:', error)
      toast.error('Erro ao buscar sessoes disponiveis')
    } finally {
      setIsLoadingSessions(false)
    }
  }, [pagination.page, pagination.limit, search, tipo, ano, legislaturaId, transcricaoStatus])

  /**
   * Fetch legislaturas for dropdown
   */
  const fetchLegislaturas = useCallback(async () => {
    try {
      const response = await transcriptionService.getLegislaturas()
      const responseData = response as { success?: boolean; legislaturas?: Legislatura[] }
      if (responseData.success) {
        setLegislaturas(responseData.legislaturas || [])
      }
    } catch (error: unknown) {
      console.error('Error fetching legislaturas:', error)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchLegislaturas()
  }, [fetchLegislaturas])

  // Fetch sessions when filters change
  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  /**
   * Handle search
   */
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchSessions()
  }

  /**
   * Handle clear filters
   */
  const handleClearFilters = () => {
    setSearch('')
    setTipo('all')
    setAno(undefined)
    setLegislaturaId(undefined)
    setTranscricaoStatus('pendente')
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  /**
   * Handle page change
   */
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  /**
   * Handle session selection
   */
  const handleSelectSession = (session: SessionForTranscription) => {
    if (selectedSession?.id === session.id) {
      setSelectedSession(null)
    } else {
      setSelectedSession(session)
    }
  }

  /**
   * Handle start transcription
   */
  const handleStartTranscription = async () => {
    if (!selectedSession) {
      toast.error('Selecione uma sessao para transcrever')
      return
    }

    if (selectedSession.transcricao) {
      toast.error('Esta sessao ja possui uma transcricao')
      return
    }

    // Sessões do banco sempre processam em segmentos automaticamente
    await onStartTranscription(selectedSession, true)
    setSelectedSession(null)
  }

  /**
   * Format session date
   */
  const formatSessionDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr)
      return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    } catch {
      return dateStr
    }
  }

  /**
   * Get icon component
   */
  const getIcon = (iconName: string) => {
    const Icon = statusIconMap[iconName]
    return Icon ? <Icon className="h-3 w-3" /> : null
  }

  /**
   * Check if any filter is active
   */
  const hasActiveFilters =
    search ||
    tipo !== 'all' ||
    ano ||
    legislaturaId ||
    transcricaoStatus !== 'pendente'

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <Card className="glass glass-dark border-0">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Input */}
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por numero da sessao..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  icon={<Search className="h-5 w-5 text-gray-400" />}
                  className="focus:ring-virtualis-blue-500/50 focus:border-virtualis-blue-500/50"
                  aria-label="Buscar sessoes"
                />
              </div>
              <Button
                variant="primary"
                onClick={handleSearch}
                disabled={isLoadingSessions}
                isLoading={isLoadingSessions}
                aria-label="Buscar"
              >
                Buscar
              </Button>
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Session Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Sessao
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as 'all' | 'SO' | 'SX')}
                  className={cn(
                    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
                    'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                    'focus:outline-none focus:ring-2 focus:ring-virtualis-blue-500 focus:border-transparent',
                    'transition-colors text-sm'
                  )}
                  aria-label="Filtrar por tipo de sessao"
                >
                  <option value="all">Todos os tipos</option>
                  <option value="SO">Sessao Ordinaria</option>
                  <option value="SX">Sessao Extraordinaria</option>
                </select>
              </div>

              {/* Year Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ano
                </label>
                <select
                  value={ano || ''}
                  onChange={(e) => setAno(e.target.value ? parseInt(e.target.value) : undefined)}
                  className={cn(
                    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
                    'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                    'focus:outline-none focus:ring-2 focus:ring-virtualis-blue-500 focus:border-transparent',
                    'transition-colors text-sm'
                  )}
                  aria-label="Filtrar por ano"
                >
                  <option value="">Todos os anos</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Legislatura Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Legislatura
                </label>
                <select
                  value={legislaturaId || ''}
                  onChange={(e) => setLegislaturaId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className={cn(
                    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
                    'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                    'focus:outline-none focus:ring-2 focus:ring-virtualis-blue-500 focus:border-transparent',
                    'transition-colors text-sm'
                  )}
                  aria-label="Filtrar por legislatura"
                >
                  <option value="">Todas as legislaturas</option>
                  {legislaturas.map((leg) => (
                    <option key={leg.id} value={leg.id}>
                      {leg.numero}a Legislatura
                    </option>
                  ))}
                </select>
              </div>

              {/* Transcription Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status Transcricao
                </label>
                <select
                  value={transcricaoStatus}
                  onChange={(e) => setTranscricaoStatus(e.target.value as 'all' | 'transcrita' | 'pendente')}
                  className={cn(
                    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
                    'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                    'focus:outline-none focus:ring-2 focus:ring-virtualis-blue-500 focus:border-transparent',
                    'transition-colors text-sm'
                  )}
                  aria-label="Filtrar por status de transcricao"
                >
                  <option value="all">Todos</option>
                  <option value="pendente">Nao transcritas</option>
                  <option value="transcrita">Ja transcritas</option>
                </select>
              </div>

              {/* Refresh Button */}
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={fetchSessions}
                  disabled={isLoadingSessions}
                  className="w-full"
                  aria-label="Atualizar lista"
                >
                  <RefreshCw className={cn('h-4 w-4 mr-2', isLoadingSessions && 'animate-spin')} />
                  Atualizar
                </Button>
              </div>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar filtros
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => setIsSessionsListOpen(!isSessionsListOpen)}
          className="w-full flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Database className="h-5 w-5 text-virtualis-blue-500" />
              Sessoes Disponiveis
            </h3>
            <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {pagination.total} {pagination.total === 1 ? 'sessao' : 'sessoes'}
            </span>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-gray-400 transition-transform duration-200",
              isSessionsListOpen ? "transform rotate-180" : ""
            )}
          />
        </button>

        <AnimatePresence>
          {isSessionsListOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="max-h-[400px] overflow-y-auto">
                {isLoadingSessions ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-virtualis-blue-500" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>Nenhuma sessao encontrada</p>
                    <p className="text-sm mt-1">Ajuste os filtros para ver mais sessoes</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {sessions.map((session) => {
                      const isSelected = selectedSession?.id === session.id
                      const hasTranscription = !!session.transcricao
                      const typeConfig = SESSION_TYPES[session.tipo]

                      return (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={cn(
                            'p-4 cursor-pointer transition-all duration-200',
                            isSelected
                              ? 'bg-gradient-to-t from-virtualis-gold-500/10 to-transparent border-l-4 border-virtualis-gold-500'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-4 border-transparent',
                            hasTranscription && 'opacity-60'
                          )}
                          onClick={() => !hasTranscription && handleSelectSession(session)}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {/* Selection indicator */}
                              <div
                                className={cn(
                                  'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0',
                                  isSelected
                                    ? 'bg-virtualis-gold-500 border-virtualis-gold-500 text-white'
                                    : hasTranscription
                                      ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700'
                                      : 'border-gray-300 dark:border-gray-600 hover:border-virtualis-gold-400'
                                )}
                              >
                                {isSelected && <Check className="h-3 w-3" />}
                                {hasTranscription && !isSelected && <Check className="h-3 w-3 text-green-500" />}
                              </div>

                              {/* Session info */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={cn('text-xs', typeConfig.color)}>
                                    {typeConfig.label}
                                  </Badge>
                                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    Sessao #{session.numero}
                                  </span>
                                  {session.legislatura && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      ({session.legislatura.numero}a Leg.)
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatSessionDate(session.data)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Youtube className="h-3 w-3 text-red-500" />
                                    Video disponivel
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Transcription status */}
                            <div className="flex-shrink-0 flex items-center gap-2">
                              {session.transcricao && (['pending', 'processing'].includes(session.transcricao.status)) && (
                                  <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={async (e) => {
                                          e.stopPropagation();
                                          if (session.transcricao?.id) {
                                              await onCancelTranscription(session.transcricao.id);
                                              fetchSessions();
                                          }
                                      }}
                                      className="h-6 w-6 p-0 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                      title="Cancelar transcrição"
                                  >
                                      <CircleStop className="h-4 w-4" />
                                  </Button>
                              )}

                              {session.transcricao ? (
                                <Badge
                                  className={cn(
                                    'text-xs',
                                    TRANSCRIPTION_STATUS[session.transcricao.status as keyof typeof TRANSCRIPTION_STATUS]?.color ||
                                    TRANSCRIPTION_STATUS.completed.color
                                  )}
                                >
                                  {getIcon(TRANSCRIPTION_STATUS[session.transcricao.status as keyof typeof TRANSCRIPTION_STATUS]?.icon || 'Check')}
                                  <span className="ml-1">
                                    {TRANSCRIPTION_STATUS[session.transcricao.status as keyof typeof TRANSCRIPTION_STATUS]?.label || 'Transcrita'}
                                  </span>
                                </Badge>
                              ) : (
                                <Badge className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                  <FileAudio className="h-3 w-3" />
                                  <span className="ml-1">Nao transcrita</span>
                                </Badge>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Pagina {pagination.page} de {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1 || isLoadingSessions}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || isLoadingSessions}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Session Preview */}
      <AnimatePresence>
        {selectedSession && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-virtualis-gold-500/50 bg-virtualis-gold-500/5">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-virtualis-gold-600 dark:text-virtualis-gold-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Sessao selecionada para transcricao</span>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-3">
                      <Youtube className="h-6 w-6 text-red-500" />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {SESSION_TYPES[selectedSession.tipo].label} #{selectedSession.numero}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatSessionDate(selectedSession.data)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                      <Link className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{selectedSession.urlTransmissao}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-4">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedSession(null)}
                        disabled={isLoading}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleStartTranscription}
                        disabled={isLoading}
                        isLoading={isLoading}
                        className="bg-virtualis-gold-500 hover:bg-virtualis-gold-600 text-white border-transparent"
                      >
                        <Mic className="h-4 w-4 mr-2" />
                        Transcrever Sessao
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SessionSelector
