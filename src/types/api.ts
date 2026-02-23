import { MateriaType } from '@/lib/constants'
import { User } from '@/types/auth'

export interface Materia {
  id: string
  tipo: MateriaType
  numero: string
  ano: number
  ementa: string
  assunto?: string
  documento_texto?: string
  texto_original?: string
  observacao?: string
  status: 'draft' | 'em_tramitacao' | 'aprovado' | 'rejeitado' | 'arquivado'
  author_id: string
  author_name: string
  created_at: string
  updated_at: string
  tags?: string[]
  id_usuario_envio_protocolo?: number | string
  chave_recibo?: string
}

export interface MateriaFormData {
  tipo: MateriaType
  ementa: string
  assunto?: string
  documento_texto?: string
  tags?: string[]
}

export interface MateriaFilters {
  tipo?: MateriaType[]
  status?: string[]
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export interface SearchResult {
  id: string
  tipo: MateriaType
  ementa: string
  assunto: string
  similarity_score: number
  documento_texto?: string
  created_at: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date | string
  conversationId?: string
  metadata?: {
    mode?: 'fast' | 'deep' | 'sql'
    model?: string
    analysisResult?: unknown
    [key: string]: unknown
  }
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  name: string
  type: string
  size: number
  url: string
  created_at: string
}

export interface DashboardStats {
  total_materias: number
  materias_mes: number
  em_tramitacao: number
  aprovadas: number
}

// DeepSeek Analysis Types
export interface AnalysisStep {
  id: string
  name: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  message?: string
}

export interface AnalysisMode {
  id: 'fast' | 'deep' | 'sql'
  name: string
  description: string
  estimatedTime: string
  icon: string
  confidence: number
  color: string
}

export interface AnalysisCompliance {
  score: number
  issues: string[]
  suggestions: string[]
}

export interface AnalysisResultData {
  summary: string
  detailedAnalysis: string
  recommendations: string[]
  legalBasis: string[]
  compliance: AnalysisCompliance
}

export interface AnalysisMetadata {
  model: string
  tokens: number
  timestamp: Date
  processingTime?: number
}

export interface AnalysisResult {
  id: string
  query: string
  mode: AnalysisMode
  confidence: number
  processingTime: number
  result: AnalysisResultData
  metadata: AnalysisMetadata
}

export interface LoginResponse {
  token: string
  user: User
}

export interface ProfileUpdateData {
  name?: string
  phone?: string
  avatar?: string
  bio?: string
}

export type PreferencesData = Record<string, unknown>

export interface ExportDataResponse {
  success: boolean
  data: unknown
}

export interface MateriasListParams {
  tipo?: string
  status?: string
  limit?: number
  offset?: number
}

export interface MateriaCreateData {
  tipo: string
  ementa: string
  assunto?: string
  documento_texto?: string
}

export type MateriaUpdateData = Partial<MateriaCreateData>

export interface SearchOptions {
  completeSearch?: boolean
  filters?: Record<string, unknown>
}

export interface ConversationCreateData {
  title: string
}

export interface MessageSendData {
  message: string
  conversationId?: string
  completeSearch?: boolean
  mode?: string
}

export interface DocumentCreateData {
  title: string
  content: string
  type: string
}

export interface DocumentUploadResponse {
  success: boolean
  id: string
  url: string
}

export interface AnalyzeRequest {
  query: string
  mode: 'fast' | 'deep' | 'sql'
  contextData?: Record<string, unknown>
}

export interface ClassifyQueryResponse {
  intent: string
  confidence: number
}

export interface AgendaItem {
  id?: number
  title?: string
  titulo?: string  // Portuguese variant from backend
  description?: string
  descricao?: string  // Portuguese variant from backend
  type?: string
  date?: string
  data?: string  // Portuguese variant from backend
  time?: string
  location?: string
}

export type AgendaCreateData = Omit<AgendaItem, 'id'>

export type AgendaUpdateData = Partial<AgendaCreateData>

export interface Work {
  id?: number
  titulo: string
  descricao: string
  status: string
  user_id: number
}

export type WorkCreateData = Omit<Work, 'id'>

export interface Inspection {
  id: number
  work_id: number
  data: string
  observacoes: string
}

export interface TranscriptionOptions {
  idSessao?: number
  segmented?: boolean
}

export interface TranscriptionJob {
  id: string
  status: string
  progress: number
  result?: string
}

export interface SessionsParams {
  page?: number
  limit?: number
  tipo?: string
  ano?: number
  legislatura?: number
  search?: string
  transcricaoStatus?: 'all' | 'transcrita' | 'pendente'
}

export interface TranscriptionAnalysis {
  summary: string
  keyPoints: string[]
  decisions: string[]
}

export interface AdminStatsParams {
  from?: string
  to?: string
}

export interface ConversationsParams {
  page?: number
  limit?: number
  userId?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}

export interface FlagConversationData {
  flagType: string
  notes?: string
}

export interface HealthStatus {
  status: string
  services: Record<string, boolean>
}
