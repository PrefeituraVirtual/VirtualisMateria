/**
 * Type definitions for Atas (Session Minutes) in Materia Virtualis
 */

// Session types based on database values
export type SessionType = 'SO' | 'SX'

// Ata status based on database values
export type AtaStatus = 'CAD' | 'EV' | 'AGLV' | 'APR'

export interface SessionParticipant {
  id: number
  name: string
  role: string
  present: boolean
  arrivalTime?: string
  departureTime?: string
}

export interface AgendaItem {
  id: number
  order: number
  title: string
  description?: string
  type: string
  materiaId?: number
  result?: string
  votingResult?: VotingResult
}

export interface VotingResult {
  favor: number
  against: number
  abstention: number
  approved: boolean
}

// API response structure for ata detail
export interface Ata {
  id: number
  idSessao?: number
  titulo?: string
  situacao?: AtaStatus
  arquivo?: string | null
  arquivoWord?: string | null
  observacao?: string | null
  createdAt: string
  updatedAt: string
  sessao?: {
    numero: number
    tipo: SessionType
    data: string
    status: string
    horarioInicio?: string | null
    horarioFim?: string | null
    idPresidente?: number
    idPrimeiroSecretario?: number
    idSegundoSecretario?: number
    urlTransmissao?: string
  }
  // Legacy properties for compatibility
  sessionNumber?: number
  sessionType?: SessionType
  sessionDate?: string
  startTime?: string
  endTime?: string
  status?: AtaStatus
  title?: string
  summary?: string
  content?: string
  location?: string
  president?: string
  secretary?: string
  participants?: SessionParticipant[]
  agendaItems?: AgendaItem[]
  attachments?: AtaAttachment[]
  publishedAt?: string
  createdBy?: number
  approvedBy?: number
}

export interface AtaAttachment {
  id: number
  name: string
  type: string
  url: string
  size: number
  uploadedAt: string
}

// API response structure for ata summary
export interface AtaSummary {
  id: number
  idSessao: number
  titulo: string
  situacao: AtaStatus
  arquivo?: string | null
  arquivoWord?: string | null
  observacao?: string | null
  createdAt: string
  updatedAt: string
  sessao?: {
    numero: number
    tipo: SessionType
    data: string
    status: string
    horarioInicio?: string | null
    horarioFim?: string | null
  }
  // Mapped properties for component compatibility
  sessionNumber?: number
  sessionType?: SessionType
  sessionDate?: string
  status?: AtaStatus
  title?: string
  summary?: string
  participantCount?: number
  agendaItemCount?: number
}

export interface AtaFiltersType {
  search?: string
  sessionType?: SessionType | 'all'
  status?: AtaStatus | 'all'
  dateFrom?: string
  dateTo?: string
  year?: number
}

export interface AtaPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface AtasListResponse {
  success: boolean
  data: AtaSummary[]
  pagination: AtaPagination
}

export interface AtaResponse {
  success: boolean
  data: Ata
}

// Stats response structure from API
export interface AtaStatsType {
  total: number
  byStatus: Array<{ status: AtaStatus; count: number }>
  bySessionType: Array<{ type: SessionType; count: number }>
  byYear: Array<{ year: number; count: number }>
}

export const SESSION_TYPES: Record<SessionType, { label: string; color: string; icon: string }> = {
  SO: { label: 'Sessão Ordinária', color: 'blue', icon: 'Calendar' },
  SX: { label: 'Sessão Extraordinária', color: 'orange', icon: 'AlertCircle' },
}

export const ATA_STATUSES: Record<AtaStatus, { label: string; color: string; icon: string }> = {
  CAD: { label: 'Cadastrada', color: 'gray', icon: 'Edit3' },
  EV: { label: 'Em Votação', color: 'yellow', icon: 'Vote' },
  AGLV: { label: 'Aguardando Leitura/Votação', color: 'orange', icon: 'Clock' },
  APR: { label: 'Aprovada', color: 'green', icon: 'CheckCircle' },
}

// AI-Generated Ata Types
export interface AIGeneratedAtaData {
  ataId: number
  structuredData: {
    header?: {
      sessao_numero: string
      data: string
      presentes_count: number
      presentes: string[]
    }
    ordem_dia?: {
      segunda_discussao?: Array<{
        projeto_numero: string
        votacao: {
          favoraveis: number
          contrarios: number
          abstencoes?: number
          total_votos: number
        }
      }>
    }
  }
  officialText: string
  validation: {
    contagem_votos?: boolean
    warnings?: string[]
    errors?: string[]
  }
  dbValidation: {
    projetos_validados?: boolean
    projetos_nao_encontrados?: string[]
  }
  modelUsed: string
  tokensUsed?: number
  processingTimeSeconds?: number
}

export interface AIGenerationPhase {
  phase: 1 | 2 | 3 | 4 | 5 | 6
  name: string
  description: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  message?: string
}

