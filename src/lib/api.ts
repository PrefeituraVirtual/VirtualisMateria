import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'
import { User } from '@/types/auth'
import {
  apiRateLimiter,
  chatRateLimiter,
  uploadRateLimiter,
  analysisRateLimiter,
  RateLimitError,
  RateLimiter,
} from './rate-limiter'
import {
  getCSRFToken,
  requiresCSRFProtection,
} from './csrf-protection'
import {
  logRateLimitExceeded,
  logInvalidToken,
} from './security-logger'
import {
  setSecureItem,
  getSecureItem,
  removeSecureItem,
  clearSecureStorage,
  clearSessionKey,
} from './secure-storage'
import { sanitizeUserForStorage } from './auth-storage'
import {
  AdminStatsParams,
  AgendaCreateData,
  AgendaItem,
  AgendaUpdateData,
  AnalysisResult,
  ChatMessage,
  ClassifyQueryResponse,
  Conversation,
  ConversationsParams,
  Document,
  DocumentCreateData,
  DocumentUploadResponse,
  ExportDataResponse,
  FlagConversationData,
  HealthStatus,
  Inspection,
  Materia,
  MateriaCreateData,
  MateriaUpdateData,
  MateriasListParams,
  MessageSendData,
  PreferencesData,
  ProfileUpdateData,
  SearchOptions,
  SearchResult,
  SessionsParams,
  TranscriptionAnalysis,
  TranscriptionJob,
  TranscriptionOptions,
  Work,
  WorkCreateData
} from '@/types/api'
import type { Ata, AtaResponse, AtaStatsType, AtasListResponse, SessionParticipant } from '@/types/ata'

// ============================================================================
// Custom ApiError Class
// ============================================================================

/**
 * Custom error class for API errors with structured information
 * Provides user-friendly messages and detailed error context
 */
export class ApiError extends Error {
  /** HTTP status code (e.g., 400, 401, 500) */
  public statusCode?: number
  /** Error code from the server (e.g., 'VALIDATION_ERROR', 'AUTH_EXPIRED') */
  public code?: string
  /** Additional error details from the server response */
  public details?: unknown
  /** Whether this error is retryable */
  public retryable: boolean

  constructor(
    message: string,
    statusCode?: number,
    code?: string,
    details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
    // Errors 5xx and 429 are generally retryable
    this.retryable = statusCode !== undefined && (statusCode >= 500 || statusCode === 429)
  }

  /**
   * Check if error is an authentication error
   */
  isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403
  }

  /**
   * Check if error is a validation error
   */
  isValidationError(): boolean {
    return this.statusCode === 400 || this.statusCode === 422
  }

  /**
   * Check if error is a server error
   */
  isServerError(): boolean {
    return this.statusCode !== undefined && this.statusCode >= 500
  }

  /**
   * Check if error is a network/connection error
   */
  isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR' || this.code === 'ECONNABORTED'
  }
}

// ============================================================================
// User-Friendly Error Messages
// ============================================================================

/**
 * Maps HTTP status codes to user-friendly Portuguese error messages
 */
const ERROR_MESSAGES: Record<number, string> = {
  400: 'Dados invalidos. Verifique os campos e tente novamente.',
  401: 'Sessao expirada. Faca login novamente.',
  403: 'Voce nao tem permissao para esta acao.',
  404: 'Recurso nao encontrado.',
  409: 'Conflito de dados. O recurso ja existe ou foi modificado.',
  422: 'Os dados enviados nao puderam ser processados.',
  429: 'Muitas requisicoes. Aguarde um momento antes de tentar novamente.',
  500: 'Erro no servidor. Tente novamente em alguns instantes.',
  502: 'Servidor temporariamente indisponivel. Tente novamente.',
  503: 'Servico em manutencao. Tente novamente em breve.',
  504: 'Tempo limite do servidor excedido. Tente novamente.',
}

/**
 * Gets a user-friendly error message based on status code or error type
 */
function getErrorMessage(error: AxiosError): string {
  const status = error.response?.status
  const serverMessage = (error.response?.data as { message?: string })?.message

  // Prefer server-provided message if it exists and is meaningful
  if (serverMessage && serverMessage.length > 0 && serverMessage.length < 200) {
    return serverMessage
  }

  // Check for specific error codes
  if (error.code === 'ECONNABORTED') {
    return 'Tempo limite excedido. A operacao demorou muito. Tente novamente.'
  }

  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response) {
    return 'Erro de conexao. Verifique sua internet.'
  }

  // Return mapped message or generic fallback
  if (status && ERROR_MESSAGES[status]) {
    return ERROR_MESSAGES[status]
  }

  return 'Ocorreu um erro inesperado. Tente novamente.'
}

// ============================================================================
// Extended Request Config Type
// ============================================================================

/**
 * Extended Axios config with retry and rate limiting options
 */
interface ExtendedRequestConfig extends AxiosRequestConfig {
  /** Number of retry attempts after the initial request (default: 3 for GET, 1 for mutations) */
  retries?: number
  /** Base delay in ms for exponential backoff (default: 1000) */
  retryDelay?: number
  /** Custom rate limiter to use for this request (default: apiRateLimiter) */
  rateLimiter?: RateLimiter
  /** Skip rate limiting for this request (use with caution) */
  skipRateLimit?: boolean
  /** Skip CSRF token for this request (use with caution) */
  skipCSRF?: boolean
}

const getBaseUrl = () => {
  // 1. Browser Environment: Handle Localhost via Proxy
  // Se estivermos no browser e a URL for localhost:4000 (ou não definida),
  // preferimos usar o path relativo '' para aproveitar os Rewrites do Next.js.
  // Isso evita problemas de CORS e erros de conexão (Network Error) ao acessar via IP.
  if (typeof window !== 'undefined') {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL

    // Se não definida, ou se aponta para localhost:4000, usa o proxy
    if (!apiUrl || apiUrl.includes('localhost:4000') || apiUrl.includes('127.0.0.1:4000')) {
      return ''
    }

    // Se for uma URL externa específica (ex: produção), usa ela
    return apiUrl
  }

  // 2. Server-side (SSR): Precisa de URL absoluta
  // Usa a variável de ambiente se existir, senão fallback para default local
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000'
}

class ApiClient {
  private client: AxiosInstance
  private csrfToken: string | null = null

  // In-memory token cache for synchronous access in interceptors
  // Tokens are loaded from secure storage on initialization
  private cachedToken: string | null = null
  private cachedUser: User | null = null
  private tokenInitialized: boolean = false
  private initPromise: Promise<void> | null = null

  constructor() {
    // Cria cliente com baseURL dinamica
    this.client = axios.create({
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 1200000, // 20 minutos para permitir processamento de IA (DeepSeek R1)
    })

    // Initialize token from secure storage (async, but we cache the result)
    this.initializeToken()

    // Interceptor para definir baseURL dinamicamente em cada requisicao
    this.client.interceptors.request.use(
      (config) => {
        // Define baseURL dinamicamente (importante para SSR vs browser)
        config.baseURL = getBaseUrl()

        // Use cached token for synchronous access
        const token = this.getCachedToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }

        // Add CSRF token for state-changing requests
        const method = config.method?.toUpperCase() || 'GET'
        if (requiresCSRFProtection(method)) {
          const csrfToken = this.csrfToken || getCSRFToken()
          if (csrfToken) {
            config.headers['X-CSRF-Token'] = csrfToken
          }
        }

        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor para tratamento de erros com ApiError
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const status = error.response?.status

        // Handle 401 - redirect to login
        if (status === 401) {
          // Log invalid token event (reason, optional userId)
          logInvalidToken(`HTTP 401 on ${error.config?.url || 'unknown'}`)

          this.clearTokenSync()
          // Also clear secure storage asynchronously
          this.clearSecureAuth()

          if (typeof window !== 'undefined') {
            // Avoid redirect loop if already on login page
            if (!window.location.pathname.includes('/auth/login')) {
              window.location.href = '/auth/login'
            }
          }
        }

        return Promise.reject(this.handleError(error))
      }
    )
  }

  /**
   * Initialize token from secure storage
   * Called on construction and when needed
   */
  private async initializeToken(): Promise<void> {
    if (typeof window === 'undefined') return

    // Prevent multiple simultaneous initializations
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = (async () => {
      try {
        // Try to load token from secure storage
        const token = await getSecureItem<string>('authToken')
        const user = await getSecureItem<User>('user')

        if (token) {
          this.cachedToken = token
          this.cachedUser = user
        }

        this.tokenInitialized = true
      } catch (error) {
        console.warn('[ApiClient] Falha ao carregar token do secure storage:', error)
        this.tokenInitialized = true
      }
    })()

    return this.initPromise
  }

  /**
   * Gets the cached token synchronously
   * Returns null if not initialized yet
   */
  getCachedToken(): string | null {
    return this.cachedToken
  }

  /**
   * Gets the cached user synchronously
   */
  getCachedUser(): User | null {
    return this.cachedUser
  }

  /**
   * Clears token from memory synchronously
   */
  private clearTokenSync(): void {
    this.cachedToken = null
    this.cachedUser = null
  }

  /**
   * Clears auth data from secure storage asynchronously
   */
  private async clearSecureAuth(): Promise<void> {
    try {
      removeSecureItem('authToken')
      removeSecureItem('user')
      clearSessionKey()
    } catch (error) {
      console.warn('[ApiClient] Erro ao limpar secure storage:', error)
    }
  }

  /**
   * Stores auth data in secure storage and updates cache
   * @param token - JWT token
   * @param user - User data
   */
  async setAuth(token: string, user: User): Promise<void> {
    // Update cache immediately for synchronous access
    this.cachedToken = token
    this.cachedUser = user

    // Store in secure storage with 24-hour TTL
    const ttl = 24 * 60 * 60 * 1000 // 24 hours
    await setSecureItem('authToken', token, { ttl })
    await setSecureItem('user', sanitizeUserForStorage(user), { ttl })
  }

  /**
   * Clears all auth data from cache and secure storage
   */
  async clearAuth(): Promise<void> {
    this.clearTokenSync()
    await this.clearSecureAuth()
    clearSecureStorage()
  }

  /**
   * Checks if user is authenticated (sync check from cache)
   */
  isAuthenticated(): boolean {
    return this.cachedToken !== null
  }

  /**
   * Waits for token initialization to complete
   * Use this when you need to ensure tokens are loaded before making requests
   */
  async waitForInit(): Promise<void> {
    if (this.tokenInitialized) return
    await this.initializeToken()
  }

  /**
   * Gets the current auth token from cache
   * For use in methods that need direct token access (e.g., fetch calls)
   */
  getAuthToken(): string | null {
    return this.cachedToken
  }

  /**
   * Sets the CSRF token to be used for state-changing requests
   * Call this after receiving a token from the server
   *
   * @param token - The CSRF token to use
   */
  setCSRFToken(token: string): void {
    this.csrfToken = token
  }

  /**
   * Clears the stored CSRF token
   */
  clearCSRFToken(): void {
    this.csrfToken = null
  }

  /**
   * Checks rate limit and throws RateLimitError if exceeded
   * Logs the event for security monitoring
   *
   * @param limiter - Rate limiter to check
   * @param url - Request URL for logging
   * @throws RateLimitError if rate limit is exceeded
   */
  private checkRateLimit(limiter: RateLimiter, url: string): void {
    if (!limiter.tryConsume()) {
      const retryAfterMs = limiter.getTimeUntilNextToken()
      const userId = this.getUserId()

      // Log the rate limit event
      logRateLimitExceeded(url, userId || undefined, retryAfterMs)

      throw new RateLimitError(limiter.name, retryAfterMs)
    }
  }

  /**
   * Gets the current user ID for logging purposes
   * Uses cached user data instead of direct localStorage access
   */
  private getUserId(): string | null {
    if (typeof window === 'undefined') return null
    try {
      const user = this.cachedUser
      if (user) {
        return user.id?.toString() || null
      }
    } catch {
      // Ignore errors
    }
    return null
  }

  /**
   * Centralized API error handling to normalize Axios errors into ApiError
   */
  private handleError(error: AxiosError | ApiError | unknown): ApiError {
    if (error instanceof ApiError) return error

    if (!axios.isAxiosError(error)) {
      return new ApiError('Ocorreu um erro inesperado. Tente novamente.')
    }

    const status = error.response?.status
    const serverMessage = (error.response?.data as { message?: string })?.message
    const errorCode = (error.response?.data as { code?: string })?.code || error.code
    const retryAfterMs = this.getRetryAfterMs(error) ?? undefined
    const isTimeout = error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout')
    const isNetworkError = error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response
    const isCanceled = error.code === 'ERR_CANCELED' || error.name === 'CanceledError'

    const message = serverMessage || getErrorMessage(error)

    const apiError = new ApiError(
      message,
      status,
      errorCode,
      {
        status,
        data: error.response?.data,
        headers: error.response?.headers,
        retryAfterMs,
        isTimeout,
        isNetworkError,
        isCanceled,
        method: error.config?.method,
        url: error.config?.url,
      }
    )

    if (process.env.NODE_ENV === 'development') {
      console.error('[ApiError]', {
        url: error.config?.url,
        method: error.config?.method,
        status,
        message,
        serverMessage,
        code: errorCode,
        retryAfterMs,
      })
    }

    return apiError
  }

  /**
   * Extracts Retry-After header value in milliseconds
   * @param error - Axios error with potential Retry-After header
   * @returns Delay in milliseconds, or null if not present
   */
  private getRetryAfterMs(error: AxiosError): number | null {
    const retryAfter = error.response?.headers?.['retry-after']
    if (!retryAfter) return null

    // Retry-After can be seconds (number) or HTTP date
    const seconds = parseInt(retryAfter, 10)
    if (!isNaN(seconds)) {
      return seconds * 1000
    }

    // Try parsing as HTTP date
    const date = Date.parse(retryAfter)
    if (!isNaN(date)) {
      return Math.max(0, date - Date.now())
    }

    return null
  }

  /**
   * Executes a request with retry logic and exponential backoff
   * Respects Retry-After header for 429 and 503 responses
   * @param fn - Function that returns a promise to retry
   * @param retries - Number of retry attempts
   * @param delay - Base delay in milliseconds for exponential backoff
   * @returns Promise with the result
   */
  private async retryRequest<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    const maxRetries = Math.max(0, retries)
    let lastError: ApiError | Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error: unknown) {
        const apiError = this.handleError(error)
        lastError = apiError

        const status = apiError.statusCode
        const details = apiError.details as {
          retryAfterMs?: number
          isTimeout?: boolean
          isNetworkError?: boolean
          isCanceled?: boolean
        } | undefined

        if (details?.isCanceled) {
          throw apiError
        }

        if (status && status >= 400 && status < 500 && status !== 429) {
          throw apiError
        }

        const shouldRetry =
          details?.isTimeout ||
          details?.isNetworkError ||
          status === 429 ||
          (status !== undefined && status >= 500)

        if (!shouldRetry || attempt >= maxRetries) {
          throw apiError
        }

        const retryAfterMs = details?.retryAfterMs
        const backoffDelay = delay * Math.pow(2, attempt)
        const baseDelay = retryAfterMs ? Math.max(retryAfterMs, backoffDelay) : backoffDelay
        const jitterFactor = 0.8 + Math.random() * 0.4
        const waitMs = Math.round(baseDelay * jitterFactor)

        if (process.env.NODE_ENV === 'development') {
          console.log(`[ApiClient] Retry attempt ${attempt + 1}/${maxRetries + 1} after ${waitMs}ms`)
        }

        await new Promise((resolve) => setTimeout(resolve, waitMs))
      }
    }

    throw lastError || new ApiError('Ocorreu um erro inesperado. Tente novamente.')
  }

  // ============================================================================
  // HTTP Methods with Retry Support and Rate Limiting
  // ============================================================================

  /**
   * GET request with automatic retry for transient failures
   * @param url - Request URL
   * @param config - Axios config with optional retry and rate limiting settings
   * @throws RateLimitError if rate limit is exceeded
   */
  async get<T = unknown>(url: string, config?: ExtendedRequestConfig): Promise<T> {
    const {
      retries = 3,
      retryDelay = 1000,
      rateLimiter = apiRateLimiter,
      skipRateLimit = false,
      skipCSRF: _skipCSRF,
      ...axiosConfig
    } = config || {}

    // Check rate limit before making request
    if (!skipRateLimit) {
      this.checkRateLimit(rateLimiter, url)
    }

    return this.retryRequest(
      async () => {
        const response = await this.client.get<T>(url, axiosConfig)
        return response.data
      },
      retries,
      retryDelay
    )
  }

  /**
   * POST request with retry support (default: 1 retry for mutations)
   * @param url - Request URL
   * @param data - Request body
   * @param config - Axios config with optional retry and rate limiting settings
   * @throws RateLimitError if rate limit is exceeded
   */
  async post<T = unknown>(url: string, data?: unknown, config?: ExtendedRequestConfig): Promise<T> {
    const {
      retries = 1,
      retryDelay = 1000,
      rateLimiter = apiRateLimiter,
      skipRateLimit = false,
      skipCSRF: _skipCSRF,
      ...axiosConfig
    } = config || {}

    // Check rate limit before making request
    if (!skipRateLimit) {
      this.checkRateLimit(rateLimiter, url)
    }

    return this.retryRequest(
      async () => {
        const response = await this.client.post<T>(url, data, axiosConfig)
        return response.data
      },
      retries,
      retryDelay
    )
  }

  /**
   * PUT request with retry support (default: 1 retry for mutations)
   * @param url - Request URL
   * @param data - Request body
   * @param config - Axios config with optional retry and rate limiting settings
   * @throws RateLimitError if rate limit is exceeded
   */
  async put<T = unknown>(url: string, data?: unknown, config?: ExtendedRequestConfig): Promise<T> {
    const {
      retries = 1,
      retryDelay = 1000,
      rateLimiter = apiRateLimiter,
      skipRateLimit = false,
      skipCSRF: _skipCSRF,
      ...axiosConfig
    } = config || {}

    // Check rate limit before making request
    if (!skipRateLimit) {
      this.checkRateLimit(rateLimiter, url)
    }

    return this.retryRequest(
      async () => {
        const response = await this.client.put<T>(url, data, axiosConfig)
        return response.data
      },
      retries,
      retryDelay
    )
  }

  /**
   * PATCH request with retry support (default: 1 retry for mutations)
   * @param url - Request URL
   * @param data - Request body
   * @param config - Axios config with optional retry and rate limiting settings
   * @throws RateLimitError if rate limit is exceeded
   */
  async patch<T = unknown>(url: string, data?: unknown, config?: ExtendedRequestConfig): Promise<T> {
    const {
      retries = 1,
      retryDelay = 1000,
      rateLimiter = apiRateLimiter,
      skipRateLimit = false,
      skipCSRF: _skipCSRF,
      ...axiosConfig
    } = config || {}

    // Check rate limit before making request
    if (!skipRateLimit) {
      this.checkRateLimit(rateLimiter, url)
    }

    return this.retryRequest(
      async () => {
        const response = await this.client.patch<T>(url, data, axiosConfig)
        return response.data
      },
      retries,
      retryDelay
    )
  }

  /**
   * DELETE request with retry support (default: 1 retry for mutations)
   * @param url - Request URL
   * @param config - Axios config with optional retry and rate limiting settings
   * @throws RateLimitError if rate limit is exceeded
   */
  async delete<T = unknown>(url: string, config?: ExtendedRequestConfig): Promise<T> {
    const {
      retries = 1,
      retryDelay = 1000,
      rateLimiter = apiRateLimiter,
      skipRateLimit = false,
      skipCSRF: _skipCSRF,
      ...axiosConfig
    } = config || {}

    // Check rate limit before making request
    if (!skipRateLimit) {
      this.checkRateLimit(rateLimiter, url)
    }

    return this.retryRequest(
      async () => {
        const response = await this.client.delete<T>(url, axiosConfig)
        return response.data
      },
      retries,
      retryDelay
    )
  }
}

export const api = new ApiClient()

// Serviços específicos
/**
 * Servico de autenticacao para sessao e perfil.
 *
 * Armazena tokens em storage seguro e expõe utilitarios de perfil.
 * Metodos que consultam o backend exigem JWT valido.
 *
 * @namespace authService
 * @example
 * ```ts
 * try {
 *   await authService.login(token, userData)
 *   const me = await authService.getMe()
 *   console.log(me.user.name)
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.error(error.message)
 *   }
 * }
 * ```
 */
export const authService = {
  /**
   * Armazena credenciais no storage seguro.
   *
   * @param {string} token - JWT recebido no login
   * @param {User} user - Dados do usuario autenticado
   * @returns {Promise<void>} Resolucao quando tokens forem persistidos
   * @throws {Error} Erro ao salvar no storage seguro
   */
  login: async (token: string, user: User): Promise<void> => {
    await api.setAuth(token, user)
  },

  /**
   * Limpa credenciais locais e cache de usuario.
   *
   * @returns {Promise<void>} Resolucao quando dados forem removidos
   */
  logout: async (): Promise<void> => {
    await api.clearAuth()
  },

  /**
   * Retorna usuario do cache em memoria (sincrono).
   *
   * @returns {User | null} Usuario em cache ou null
   */
  getUser: (): User | null => {
    return api.getCachedUser()
  },

  /**
   * Verifica autenticacao com base no cache local.
   *
   * @returns {boolean} True quando ha token e usuario em cache
   */
  isAuthenticated: (): boolean => {
    return api.isAuthenticated()
  },

  /**
   * Aguarda inicializacao de tokens no storage seguro.
   *
   * @returns {Promise<void>} Resolucao quando a inicializacao termina
   */
  waitForInit: async (): Promise<void> => {
    await api.waitForInit()
  },

  /**
   * Atualiza dados do perfil do usuario.
   *
   * @param {ProfileUpdateData} data - Dados do perfil
   * @returns {Promise<unknown>} Resposta do backend
   * @throws {ApiError} Erro de autenticacao ou validacao
   */
  updateProfile: (data: ProfileUpdateData): Promise<unknown> => {
    return api.put('/api/auth/profile', data)
  },

  /**
   * Retorna dados atualizados do usuario autenticado.
   *
   * @returns {Promise<{ success: boolean; user: User }>} Dados do usuario
   * @throws {ApiError} Erro 401/403 se nao autenticado
   */
  getMe: (): Promise<{ success: boolean; user: User }> => api.get('/api/auth/me'),

  /**
   * Atualiza preferencias do usuario autenticado.
   *
   * @param {PreferencesData} preferences - Preferencias de UI e experiencia
   * @returns {Promise<unknown>} Resposta do backend
   * @throws {ApiError} Erro de autenticacao ou validacao
   */
  updatePreferences: (preferences: PreferencesData): Promise<unknown> => {
    return api.put('/api/auth/preferences', { preferences })
  },

  /**
   * Exporta dados do usuario autenticado.
   *
   * @returns {Promise<ExportDataResponse>} Payload de exportacao
   * @throws {ApiError} Erro de autenticacao ou servidor
   */
  exportData: (): Promise<ExportDataResponse> => api.get('/api/auth/export-data'),
}

/**
 * Servico para gerenciar materias legislativas (CRUD e busca semantica).
 *
 * Requer autenticacao via JWT.
 * Rate limit padrao: 60 requisicoes/min (apiRateLimiter).
 *
 * @namespace materiasService
 * @example
 * ```ts
 * const created = await materiasService.create({
 *   tipo: 'PL',
 *   ementa: 'Autoriza o programa X',
 *   autoria: 'Vereador A'
 * })
 *
 * const updated = await materiasService.update(created.data.id, {
 *   ementa: 'Autoriza o programa X (atualizado)'
 * })
 *
 * const fetched = await materiasService.get(created.data.id)
 * await materiasService.delete(fetched.id)
 * ```
 */
export const materiasService = {
  /**
   * Lista materias com filtros e paginacao.
   *
   * @param {MateriasListParams} [params] - Filtros e pagina
   * @returns {Promise<{ success: boolean; data: Materia[]; count: number }>} Lista de materias
   * @throws {ApiError} Erro 401/500 em caso de falha
   */
  getAll: (params?: MateriasListParams): Promise<{ success: boolean; data: Materia[]; count: number }> =>
    api.get('/api/materias', { params }),
  /**
   * Busca uma materia por ID.
   *
   * @param {string} id - ID da materia
   * @returns {Promise<Materia>} Materia encontrada
   * @throws {ApiError} Erro 401/404 se nao encontrada
   */
  get: async (id: string): Promise<Materia> => {
    const response = await api.get<{ success?: boolean; data?: Materia } | Materia>(`/api/materias/${id}`)
    return (response as { data?: Materia }).data ?? (response as Materia)
  },
  /**
   * Cria uma nova materia legislativa.
   *
   * @param {MateriaCreateData} data - Payload da materia
   * @returns {Promise<{ success: boolean; data: Materia }>} Materia criada
   * @throws {ApiError} Erro 400/401/422 em caso de validacao
   */
  create: (data: MateriaCreateData): Promise<{ success: boolean; data: Materia }> => api.post('/api/materias', data),
  /**
   * Atualiza uma materia existente.
   *
   * @param {string} id - ID da materia
   * @param {MateriaUpdateData} data - Campos a atualizar
   * @returns {Promise<{ success: boolean; data: Materia }>} Materia atualizada
   * @throws {ApiError} Erro 400/401/404 em caso de falha
   */
  update: (id: string, data: MateriaUpdateData): Promise<{ success: boolean; data: Materia }> =>
    api.post(`/api/materias/${id}`, data), // Mocking update with POST for now or PUT if backend supports
  /**
   * Remove uma materia por ID.
   *
   * @param {string} id - ID da materia
   * @returns {Promise<unknown>} Resultado da exclusao
   * @throws {ApiError} Erro 401/404 ao excluir
   */
  delete: (id: string) => api.delete(`/api/materias/${id}`),
  /**
   * Busca semantica por materias.
   *
   * @param {string} query - Texto de busca
   * @param {number} [page=1] - Pagina atual
   * @param {SearchOptions} [options] - Opcoes adicionais de busca
   * @returns {Promise<{ success: boolean; results: SearchResult[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>} Resultados ranqueados com paginacao
   * @throws {ApiError} Erro 401/429/500 em caso de falha
   */
  search: (query: string, page: number = 1, options?: SearchOptions): Promise<{ success: boolean; results: SearchResult[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> =>
    api.post('/api/search/semantic', { query, page, ...options }),
}

/**
 * Servico de chat para conversas e mensagens.
 *
 * Requer autenticacao via JWT.
 * Rate limit: 10 mensagens/min (chatRateLimiter) no envio de mensagens.
 *
 * @namespace chatService
 * @example
 * ```ts
 * try {
 *   const convo = await chatService.createConversation('Nova conversa')
 *   const reply = await chatService.sendMessage({
 *     message: 'Oi',
 *     conversationId: convo.data.id
 *   })
 *   console.log(reply.message.content)
 * } catch (error) {
 *   if (error instanceof RateLimitError) {
 *     console.warn('Rate limit atingido, tente novamente em instantes.')
 *   }
 * }
 * ```
 */
export const chatService = {
  /**
   * Busca uma conversa por ID.
   *
   * @param {string} id - ID da conversa
   * @returns {Promise<{ success: boolean; data: Conversation }>} Conversa encontrada
   * @throws {ApiError} Erro 401/404 se nao encontrada
   */
  getConversation: (id: string): Promise<{ success: boolean; data: Conversation }> =>
    api.get<{ success: boolean; data: Conversation }>(`/api/chat/conversations/${id}`),
  /**
   * Busca historico de mensagens de uma conversa.
   *
   * @param {string} id - ID da conversa
   * @returns {Promise<{ success: boolean; data: ChatMessage[]; pagination?: unknown }>} Historico de mensagens
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  getHistory: (id: string): Promise<{ success: boolean; data: ChatMessage[]; pagination?: unknown }> =>
    api.get<{ success: boolean; data: ChatMessage[]; pagination?: unknown }>(`/api/chat/conversations/${id}`),
  /**
   * Cria uma nova conversa.
   *
   * @param {string} title - Titulo da conversa
   * @returns {Promise<{ success: boolean; data: Conversation }>} Conversa criada
   * @throws {ApiError} Erro 401/422 em caso de falha
   */
  createConversation: (title: string): Promise<{ success: boolean; data: Conversation }> =>
    api.post('/api/chat/conversations', { title }),
  /**
   * Envia mensagem para o chat com rate limiting.
   *
   * @param {MessageSendData} data - Payload da mensagem
   * @returns {Promise<{ success: boolean; message: ChatMessage }>} Mensagem de resposta
   * @throws {RateLimitError} Quando exceder 10 mensagens/min
   * @throws {ApiError} Erro 401/500 em caso de falha
   */
  sendMessage: (data: MessageSendData): Promise<{ success: boolean; message: ChatMessage }> =>
    api.post('/api/chat/send', data, { rateLimiter: chatRateLimiter }),
  /**
   * Exclui uma conversa.
   *
   * @param {string} id - ID da conversa
   * @returns {Promise<unknown>} Resultado da exclusao
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  deleteConversation: (id: string) => api.delete(`/api/chat/conversations/${id}`),

  /**
   * Lista todas as conversas do usuario.
   *
   * @returns {Promise<{ success: boolean; data: Conversation[]; pagination?: unknown }>} Conversas existentes
   * @throws {ApiError} Erro 401/500 em caso de falha
   */
  getConversations: (): Promise<{ success: boolean; data: Conversation[]; pagination?: unknown }> =>
    api.get<{ success: boolean; data: Conversation[]; pagination?: unknown }>('/api/chat/conversations'),
}

/**
 * Servico de documentos para criar, listar e baixar arquivos.
 *
 * Requer autenticacao via JWT.
 * Upload usa uploadRateLimiter (5 uploads/minuto).
 *
 * @namespace documentsService
 * @example
 * ```ts
 * const doc = await documentsService.create({ title: 'Relatorio', content: '...', type: 'pdf' })
 * const blob = await documentsService.download(doc.data.id)
 * ```
 */
export const documentsService = {
  /**
   * Lista documentos do usuario autenticado.
   *
   * @returns {Promise<{ success: boolean; data: Document[]; pagination?: unknown }>} Lista de documentos
   * @throws {ApiError} Erro 401/500 em caso de falha
   */
  getAll: (): Promise<{ success: boolean; data: Document[]; pagination?: unknown }> =>
    api.get<{ success: boolean; data: Document[]; pagination?: unknown }>('/api/documents'),
  /**
   * Cria um documento a partir de dados estruturados.
   *
   * @param {DocumentCreateData} data - Dados do documento
   * @returns {Promise<{ success: boolean; data: Document }>} Documento criado
   * @throws {ApiError} Erro 400/422 em caso de validacao
   */
  create: (data: DocumentCreateData): Promise<{ success: boolean; data: Document }> => api.post('/api/documents', data),
  /**
   * Faz upload de arquivo via multipart/form-data.
   *
   * @param {File} file - Arquivo a ser enviado
   * @returns {Promise<DocumentUploadResponse>} Resultado do upload
   * @throws {RateLimitError} Quando exceder 5 uploads/min
   * @throws {ApiError} Erro 401/413 em caso de falha
   */
  upload: (file: File): Promise<DocumentUploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/api/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      rateLimiter: uploadRateLimiter,
    })
  },
  /**
   * Baixa documento como Blob.
   *
   * @param {string} id - ID do documento
   * @returns {Promise<Blob>} Conteudo binario do arquivo
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  download: (id: string): Promise<Blob> => api.get<Blob>(`/api/documents/${id}/download`, {
    responseType: 'blob'
  }),
}

/**
 * Servico DeepSeek para analises e classificacoes.
 *
 * Requer autenticacao via JWT.
 * Rate limit: 3 analises/min (analysisRateLimiter) e 10 mensagens/min no chat.
 *
 * @namespace deepSeekService
 * @example
 * ```ts
 * const result = await deepSeekService.analyze('Resumo da materia', 'deep')
 * const intent = await deepSeekService.classifyQuery('Qual o prazo?')
 * ```
 */
export const deepSeekService = {
  /**
   * Executa analise de texto via DeepSeek.
   *
   * @param {string} query - Texto para analise
   * @param {'fast'|'deep'|'sql'} mode - Modo de analise
   * @param {Record<string, unknown>} [contextData] - Contexto adicional
   * @param {ExtendedRequestConfig} [config] - Config de request (timeouts, retries)
   * @returns {Promise<AnalysisResult>} Resultado da analise
   * @throws {RateLimitError} Quando exceder 3 analises/min
   * @throws {ApiError} Erro 401/500 em caso de falha
   */
  analyze: (
    query: string,
    mode: 'fast' | 'deep' | 'sql',
    contextData?: Record<string, unknown>,
    config?: ExtendedRequestConfig
  ): Promise<AnalysisResult> =>
    api.post('/api/ai/analyze', { query, mode, contextData }, {
      ...config,
      rateLimiter: analysisRateLimiter,
    }),

  /**
   * Envia mensagem para o chat com modo especifico.
   *
   * @param {string} message - Mensagem do usuario
   * @param {'fast'|'deep'|'sql'} mode - Modo selecionado
   * @param {string} [conversationId] - ID da conversa
   * @param {ExtendedRequestConfig} [config] - Config de request
   * @returns {Promise<unknown>} Resposta do chat
   * @throws {RateLimitError} Quando exceder 10 mensagens/min
   * @throws {ApiError} Erro 401/500 em caso de falha
   */
  chatWithMode: (
    message: string,
    mode: 'fast' | 'deep' | 'sql',
    conversationId?: string,
    config?: ExtendedRequestConfig
  ) => {
    // Backend espera 'standard', 'deep' ou 'r1'. Frontend usa 'fast' e 'deep'.
    const backendMode = mode === 'fast' ? 'standard' : mode;
    return api.post('/api/chat/send', { message, mode: backendMode, conversationId }, {
      ...config,
      rateLimiter: chatRateLimiter,
    });
  },

  /**
   * Executa analise via streaming (SSE).
   *
   * @param {string} query - Texto para analise
   * @param {'fast'|'deep'|'sql'} mode - Modo de analise
   * @param {(chunk: unknown) => void} onChunk - Callback para cada chunk recebido
   * @param {Record<string, unknown>} [contextData] - Contexto adicional
   * @returns {Promise<void>} Resolucao ao finalizar stream
   * @throws {Error} Quando a conexao falhar ou nao houver reader
   */
  streamAnalysis: (
    query: string,
    mode: 'fast' | 'deep' | 'sql',
    onChunk: (chunk: unknown) => void,
    contextData?: Record<string, unknown>
  ): Promise<void> => {
    // Use cached token from api client instead of direct localStorage access
    const token = api.getAuthToken()

    return new Promise<void>((resolve, reject) => {
      fetch(`${getBaseUrl()}/api/ai/analyze/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ query, mode, contextData })
      })
      .then(response => {
        if (!response.ok) throw new Error('Stream failed')

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No reader available')

        const decoder = new TextDecoder()
        let buffer = ''

        const readStream = async () => {
          try {
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6)
                  if (data === '[DONE]') {
                    resolve()
                    return
                  }
                  try {
                    const chunk: unknown = JSON.parse(data)
                    onChunk(chunk)
                  } catch {
                    console.warn('Failed to parse chunk:', data)
                  }
                }
              }
            }
            resolve()
          } catch (error) {
            reject(error)
          }
        }

        readStream()
      })
      .catch(reject)
    })
  },

  /**
   * Classifica uma consulta usando IA.
   *
   * @param {string} query - Texto da consulta
   * @returns {Promise<ClassifyQueryResponse>} Resultado da classificacao
   * @throws {ApiError} Erro 401/500 em caso de falha
   */
  classifyQuery: (query: string): Promise<ClassifyQueryResponse> => api.post('/api/ai/classify', { query }),

  /**
   * Lista analises salvas com filtros.
   *
   * @param {Record<string, unknown>} [filters] - Filtros para busca
   * @returns {Promise<{ success: boolean; data: AnalysisResult[] }>} Lista de analises
   * @throws {ApiError} Erro 401/500 em caso de falha
   */
  getAnalyses: (filters?: Record<string, unknown>): Promise<{ success: boolean; data: AnalysisResult[] }> =>
    api.get('/api/ai/analyses', { params: filters }),

  /**
   * Remove uma analise por ID.
   *
   * @param {string} id - ID da analise
   * @returns {Promise<unknown>} Resultado da exclusao
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  deleteAnalysis: (id: string) =>
    api.delete(`/api/ai/analyses/${id}`),
}

/**
 * Servico de agenda para itens de calendario.
 *
 * Requer autenticacao via JWT.
 *
 * @namespace agendaService
 * @example
 * ```ts
 * const created = await agendaService.create({ titulo: 'Sessao', data: '2024-10-01' })
 * const items = await agendaService.getAll()
 * ```
 */
export const agendaService = {
  /**
   * Lista eventos da agenda.
   *
   * @returns {Promise<{ success: boolean; data: AgendaItem[] }>} Itens da agenda
   * @throws {ApiError} Erro 401/500 em caso de falha
   */
  getAll: (): Promise<{ success: boolean; data: AgendaItem[] }> => api.get('/api/agenda'),
  /**
   * Cria um novo item de agenda.
   *
   * @param {AgendaCreateData} data - Dados do evento
   * @returns {Promise<{ success: boolean; data: AgendaItem }>} Evento criado
   * @throws {ApiError} Erro 400/422 em caso de validacao
   */
  create: (data: AgendaCreateData): Promise<{ success: boolean; data: AgendaItem }> => api.post('/api/agenda', data),
  /**
   * Atualiza item de agenda existente.
   *
   * @param {number} id - ID do evento
   * @param {AgendaUpdateData} data - Campos a atualizar
   * @returns {Promise<{ success: boolean; data: AgendaItem }>} Evento atualizado
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  update: (id: number, data: AgendaUpdateData): Promise<{ success: boolean; data: AgendaItem }> =>
    api.put(`/api/agenda/${id}`, data),
  /**
   * Remove um item de agenda.
   *
   * @param {number} id - ID do evento
   * @returns {Promise<unknown>} Resultado da exclusao
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  delete: (id: number) => api.delete(`/api/agenda/${id}`),
}

/**
 * Servico para consultar e gerenciar analises armazenadas.
 *
 * Requer autenticacao via JWT.
 *
 * @namespace aiAnalysisService
 * @example
 * ```ts
 * const list = await aiAnalysisService.getAll()
 * const updated = await aiAnalysisService.update(id, { status: 'completed' })
 * ```
 */
export const aiAnalysisService = {
  /**
   * Lista analises com filtros.
   *
   * @param {Record<string, unknown>} [filters] - Filtros para consulta
   * @returns {Promise<{ success: boolean; data: AnalysisResult[] }>} Lista de analises
   * @throws {ApiError} Erro 401/500 em caso de falha
   */
  getAll: (filters?: Record<string, unknown>): Promise<{ success: boolean; data: AnalysisResult[] }> =>
    api.get('/api/ai/analyses', { params: filters }),
  /**
   * Busca analise por ID.
   *
   * @param {string} id - ID da analise
   * @returns {Promise<{ success: boolean; data: AnalysisResult }>} Analise encontrada
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  getById: (id: string): Promise<{ success: boolean; data: AnalysisResult }> =>
    api.get<{ success: boolean; data: AnalysisResult }>(`/api/ai/analyses/${id}`),
  /**
   * Cria analise manualmente.
   *
   * @param {Partial<AnalysisResult>} data - Payload parcial
   * @returns {Promise<{ success: boolean; data: AnalysisResult }>} Analise criada
   * @throws {ApiError} Erro 400/422 em caso de validacao
   */
  create: (data: Partial<AnalysisResult>): Promise<{ success: boolean; data: AnalysisResult }> =>
    api.post('/api/ai/analyses', data),
  /**
   * Atualiza analise existente.
   *
   * @param {string} id - ID da analise
   * @param {Partial<AnalysisResult>} data - Campos a atualizar
   * @returns {Promise<{ success: boolean; data: AnalysisResult }>} Analise atualizada
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  update: (id: string, data: Partial<AnalysisResult>): Promise<{ success: boolean; data: AnalysisResult }> =>
    api.put(`/api/ai/analyses/${id}`, data),
  /**
   * Remove analise por ID.
   *
   * @param {string} id - ID da analise
   * @returns {Promise<unknown>} Resultado da exclusao
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  delete: (id: string) => api.delete(`/api/ai/analyses/${id}`),
  /**
   * Exporta analise em PDF ou JSON.
   *
   * @param {string} id - ID da analise
   * @param {'pdf'|'json'} format - Formato de exportacao
   * @returns {Promise<unknown>} Blob (pdf) ou JSON
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  export: (id: string, format: 'pdf' | 'json') =>
    api.get(`/api/ai/analyses/${id}/export`, { params: { format }, responseType: 'blob' }),
}

/**
 * Servico de obras (works) e inspecoes.
 *
 * Requer autenticacao via JWT.
 *
 * @namespace worksService
 * @example
 * ```ts
 * const list = await worksService.getAll(userId)
 * const work = await worksService.create({ titulo: 'Obra', descricao: '...', status: 'EM_ANDAMENTO', user_id: userId })
 * ```
 */
export const worksService = {
  /**
   * Lista obras por usuario.
   *
   * @param {number} userId - ID do usuario
   * @returns {Promise<{ success: boolean; data: Work[] }>} Lista de obras
   * @throws {ApiError} Erro 401/500 em caso de falha
   */
  getAll: (userId: number): Promise<{ success: boolean; data: Work[] }> => api.get(`/api/works?user_id=${userId}`),
  /**
   * Cria nova obra.
   *
   * @param {WorkCreateData} data - Dados da obra
   * @returns {Promise<{ success: boolean; data: Work }>} Obra criada
   * @throws {ApiError} Erro 400/422 em caso de validacao
   */
  create: (data: WorkCreateData): Promise<{ success: boolean; data: Work }> => api.post('/api/works', data),
  /**
   * Atualiza obra existente.
   *
   * @param {number} id - ID da obra
   * @param {Partial<WorkCreateData>} data - Campos a atualizar
   * @returns {Promise<{ success: boolean; data: Work }>} Obra atualizada
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  update: (id: number, data: Partial<WorkCreateData>): Promise<{ success: boolean; data: Work }> =>
    api.put(`/api/works/${id}`, data),
  /**
   * Remove obra por ID.
   *
   * @param {number} id - ID da obra
   * @param {number | string} userId - ID do usuario para autorizacao
   * @returns {Promise<{ success: boolean }>} Resultado da exclusao
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  delete: (id: number, userId: number | string): Promise<{ success: boolean }> =>
    api.delete<{ success: boolean }>(`/api/works/${id}?user_id=${userId}`),
  /**
   * Lista inspecoes de uma obra.
   *
   * @param {number} id - ID da obra
   * @returns {Promise<{ success: boolean; data: Inspection[] }>} Inspecoes vinculadas
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  getInspections: (id: number): Promise<{ success: boolean; data: Inspection[] }> => api.get(`/api/works/${id}/inspections`),
}

/**
 * Servico de atas (atas de sessao legislativa).
 *
 * Requer autenticacao via JWT.
 *
 * @namespace atasService
 * @example
 * ```ts
 * const list = await atasService.getAll({ year: 2024, status: 'PUBLICADA' })
 * const ata = await atasService.get(list.data[0].id)
 * ```
 */
export const atasService = {
  /**
   * Lista atas com filtros e paginacao.
   *
   * @param {Object} [params] - Filtros de listagem
   * @param {number} [params.page] - Pagina atual
   * @param {number} [params.limit] - Itens por pagina
   * @param {string} [params.search] - Texto de busca
   * @param {string} [params.sessionType] - Tipo de sessao
   * @param {string} [params.status] - Status da ata
   * @param {string} [params.dateFrom] - Data inicial (YYYY-MM-DD)
   * @param {string} [params.dateTo] - Data final (YYYY-MM-DD)
   * @param {number} [params.year] - Ano de referencia
   * @returns {Promise<AtasListResponse>} Lista paginada de atas
   * @throws {ApiError} Erro 401/500 em caso de falha
   */
  getAll: (params?: {
    page?: number
    limit?: number
    search?: string
    sessionType?: string
    status?: string
    dateFrom?: string
    dateTo?: string
    year?: number
  }): Promise<AtasListResponse> => api.get('/api/atas', { params }),

  /**
   * Busca uma ata pelo ID.
   *
   * @param {number} id - ID da ata
   * @returns {Promise<AtaResponse>} Ata encontrada
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  get: (id: number): Promise<AtaResponse> => api.get(`/api/atas/${id}`),

  /**
   * Cria uma nova ata.
   *
   * @param {Partial<Ata>} data - Dados parciais da ata
   * @returns {Promise<AtaResponse>} Ata criada
   * @throws {ApiError} Erro 400/422 em caso de validacao
   */
  create: (data: Partial<Ata>): Promise<AtaResponse> => api.post('/api/atas', data),

  /**
   * Atualiza uma ata existente.
   *
   * @param {number} id - ID da ata
   * @param {Partial<Ata>} data - Campos a atualizar
   * @returns {Promise<AtaResponse>} Ata atualizada
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  update: (id: number, data: Partial<Ata>): Promise<AtaResponse> => api.put(`/api/atas/${id}`, data),

  /**
   * Remove uma ata.
   *
   * @param {number} id - ID da ata
   * @returns {Promise<unknown>} Resultado da exclusao
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  delete: (id: number) => api.delete(`/api/atas/${id}`),

  /**
   * Retorna estatisticas das atas.
   *
   * @returns {Promise<{ success: boolean; data: AtaStatsType }>} Estatisticas agregadas
   * @throws {ApiError} Erro 401/500 em caso de falha
   */
  getStats: (): Promise<{ success: boolean; data: AtaStatsType }> => api.get('/api/atas/stats'),

  /**
   * Publica uma ata (status PUBLICADA).
   *
   * @param {number} id - ID da ata
   * @returns {Promise<unknown>} Resultado da publicacao
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  publish: (id: number) => api.post(`/api/atas/${id}/publish`),

  /**
   * Arquiva uma ata (status ARQUIVADA).
   *
   * @param {number} id - ID da ata
   * @returns {Promise<unknown>} Resultado do arquivamento
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  archive: (id: number) => api.post(`/api/atas/${id}/archive`),

  /**
   * Aprova uma ata (status APROVADA).
   *
   * @param {number} id - ID da ata
   * @returns {Promise<unknown>} Resultado da aprovacao
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  approve: (id: number) => api.post(`/api/atas/${id}/approve`),

  /**
   * Exporta uma ata em PDF.
   *
   * @param {number} id - ID da ata
   * @returns {Promise<Blob>} Blob PDF
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  exportPdf: (id: number): Promise<Blob> => api.get<Blob>(`/api/atas/${id}/pdf`, {
    responseType: 'blob'
  }),

  /**
   * Lista participantes de uma ata.
   *
   * @param {number} id - ID da ata
   * @returns {Promise<{ success: boolean; data: SessionParticipant[] }>} Participantes
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  getParticipants: (id: number): Promise<{ success: boolean; data: SessionParticipant[] }> =>
    api.get<{ success: boolean; data: SessionParticipant[] }>(`/api/atas/${id}/participants`),

  /**
   * Atualiza participantes de uma ata.
   *
   * @param {number} id - ID da ata
   * @param {SessionParticipant[]} participants - Participantes atualizados
   * @returns {Promise<unknown>} Resultado da atualizacao
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  updateParticipants: (id: number, participants: SessionParticipant[]) =>
    api.put(`/api/atas/${id}/participants`, { participants }),

  /**
   * Gera ata automaticamente via IA a partir de uma transcrição.
   *
   * @param {string} transcriptionJobId - ID do job de transcrição
   * @param {number} sessionId - ID da sessão
   * @returns {Promise<{ success: boolean; data: { ataId: number; validation: unknown; dbValidation: unknown } }>} Resultado da geração
   * @throws {ApiError} Erro 400/404 em caso de falha
   */
  generateFromAI: async (transcriptionJobId: string, sessionId: number): Promise<{
    success: boolean
    ataId: string
    sessionId: number
    validation?: unknown
    dbValidation?: unknown
  }> => {
    // Use direct backend URL to bypass Next.js proxy timeout (60s default)
    // Ata generation can take 30-40s, which may timeout through proxy
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
    const token = api.getAuthToken()

    const response = await axios.post(
      `${backendUrl}/api/atas/ai-generate`,
      { transcriptionJobId, sessionId },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        timeout: 1200000 // 20 minutes timeout for AI processing (DeepSeek R1)
      }
    )

    return response.data
  },

  /**
   * Verifica se existe uma ata gerada por IA para uma sessão.
   *
   * @param {number} sessionId - ID da sessão
   * @returns {Promise<{ success: boolean; exists: boolean; ataId: string | null; data: unknown | null }>} Status da existência
   * @throws {ApiError} Erro 400/500 em caso de falha
   */
  checkAIGeneratedExists: async (sessionId: number): Promise<{
    success: boolean
    exists: boolean
    ataId: string | null
    data: unknown | null
  }> => {
    return api.get(`/api/atas/ai-generated/check-session/${sessionId}`)
  },

  /**
   * Busca os dados estruturados JSON da ata gerada por IA.
   *
   * @param {number} ataId - ID da ata
   * @returns {Promise<{ success: boolean; data: unknown }>} Dados estruturados da ata
   * @throws {ApiError} Erro 404 em caso de falha
   */
  getAIData: (ataId: string | number): Promise<{ success: boolean; data: unknown }> =>
    api.get(`/api/atas/${ataId}/ai-data`),

  /**
   * Remove uma ata gerada por IA (admin).
   *
   * @param {string} ataId - UUID da ata gerada
   * @returns {Promise<{ success: boolean; ataId: string; sessionId?: number }>} Resultado da exclusao
   */
  deleteAIGenerated: (ataId: string): Promise<{ success: boolean; ataId: string; sessionId?: number }> =>
    api.delete(`/api/atas/ai-generated/${ataId}`),

  /**
   * Regenera uma ata gerada por IA (admin).
   *
   * @param {string} ataId - UUID da ata gerada
   * @returns {Promise<{ success: boolean; ataId: string; previousAtaId?: string }>} Resultado da regeneracao
   */
  regenerateAIGenerated: (ataId: string): Promise<{ success: boolean; ataId: string; previousAtaId?: string }> =>
    api.post(`/api/atas/ai-generated/${ataId}/regenerate`),

  /**
   * Atualiza o texto oficial de uma ata gerada por IA (admin).
   *
   * @param {string} ataId - UUID da ata gerada
   * @param {string} text - Novo texto oficial
   * @returns {Promise<{ success: boolean; data: any }>} Resultado da atualização
   */
  updateAIGenerated: (ataId: string, text: string): Promise<{ success: boolean; data: any }> =>
    api.put(`/api/atas/ai-generated/${ataId}`, { official_text: text })
}

/**
 * Opcoes para upload de audio com callbacks de progresso e timeout.
 *
 * @property {(progress: { loaded: number; total?: number; percent?: number }) => void} [onProgress] - Callback de progresso
 * @property {() => void} [onTimeout] - Callback disparado antes do timeout
 * @property {number} [timeoutMs] - Timeout base em ms
 * @property {number} [maxTimeoutMs] - Timeout maximo em ms
 * @property {AbortSignal} [signal] - AbortSignal para cancelar upload
 */
interface UploadAudioOptions {
  onProgress?: (progress: { loaded: number; total?: number; percent?: number }) => void
  onTimeout?: () => void
  timeoutMs?: number
  maxTimeoutMs?: number
  signal?: AbortSignal
}

/**
 * Opcoes para analise de transcricao.
 *
 * @property {(status: string) => void} [onProgress] - Callback de status textual
 * @property {AbortSignal} [signal] - AbortSignal para cancelar analise
 */
interface AnalyzeTranscriptionOptions {
  onProgress?: (status: string) => void
  signal?: AbortSignal
}

/**
 * Servico de transcricao para audio/video.
 *
 * Requer autenticacao via JWT. Alguns endpoints usam o backend direto
 * para evitar limites do proxy do Next.js.
 *
 * @namespace transcriptionService
 * @example
 * ```ts
 * const job = await transcriptionService.transcribeYouTube(url, { segmented: true })
 * const status = await transcriptionService.getStatus(job.jobId)
 * ```
 */
export const transcriptionService = {
  /**
   * Inicia transcricao a partir de URL do YouTube (Gemini).
   *
   * @param {string} url - URL do video
   * @param {TranscriptionOptions} [options] - Opcoes de transcricao
   * @returns {Promise<{ success: boolean; jobId: string }>} Job criado
   * @throws {ApiError} Erro 401/422 em caso de falha
   */
  transcribeYouTube: (url: string, options?: TranscriptionOptions): Promise<{ success: boolean; jobId: string }> =>
    api.post('/api/transcricao/youtube', { url, ...options }),

  /**
   * Faz upload de audio para transcricao (Whisper V2).
   *
   * IMPORTANTE: envia direto para o backend para evitar limite de 10MB do proxy Next.js.
   *
   * @param {File} file - Arquivo de audio (ate 2GB)
   * @param {number} [idSessao] - ID de sessao para vinculo da transcricao
   * @param {UploadAudioOptions} [options] - Opcoes de upload e callbacks
   * @returns {Promise<{ success: boolean; jobId: string }>} Job criado
   * @throws {Error} Erro de timeout, cancelamento ou falha de rede
   *
   * @example
   * ```ts
   * const result = await transcriptionService.uploadAudio(file)
   * console.log(result.jobId)
   * ```
   *
   * @example
   * ```ts
   * const controller = new AbortController()
   * const result = await transcriptionService.uploadAudio(file, sessionId, {
   *   onProgress: (progress) => setUploadProgress(progress.percent ?? 0),
   *   onTimeout: () => console.warn('Upload perto do timeout'),
   *   signal: controller.signal
   * })
   * // Para cancelar: controller.abort()
   * ```
   */
  uploadAudio: async (
    file: File,
    idSessao?: number,
    options: UploadAudioOptions = {}
  ): Promise<{ success: boolean; jobId: string }> => {
    const formData = new FormData()
    formData.append('audio', file)
    if (idSessao) formData.append('id_sessao', idSessao.toString())

    // Usar URL direta do backend para evitar limite de 10MB do proxy Next.js
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
    // Use cached token from api client instead of direct localStorage access
    const token = api.getAuthToken()

    const baseTimeoutMs = options.timeoutMs ?? 600000
    const maxTimeoutMs = options.maxTimeoutMs ?? 1800000
    const sizeMb = file.size / (1024 * 1024)
    const extraMinutes = sizeMb > 25 ? Math.ceil((sizeMb - 25) / 25) : 0
    const timeoutMs = Math.min(baseTimeoutMs + extraMinutes * 60000, maxTimeoutMs)

    const attemptUpload = async () => {
      const controller = new AbortController()
      const handleExternalAbort = () => controller.abort()

      if (options.signal) {
        if (options.signal.aborted) {
          controller.abort()
        } else {
          options.signal.addEventListener('abort', handleExternalAbort)
        }
      }

      const warnBeforeMs = Math.min(30000, Math.floor(timeoutMs * 0.1))
      const warnAtMs = Math.max(timeoutMs - warnBeforeMs, 0)
      const warnTimeoutId = options.onTimeout
        ? setTimeout(() => options.onTimeout?.(), warnAtMs)
        : null
      const abortTimeoutId = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const response = await axios.post(`${backendUrl}/api/transcricao/upload-v2`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token && { Authorization: `Bearer ${token}` })
          },
          timeout: timeoutMs,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          signal: controller.signal,
          onUploadProgress: (event) => {
            if (!options.onProgress) return
            const total = event.total ?? file.size
            const percent = total ? Math.round((event.loaded / total) * 100) : undefined
            options.onProgress({ loaded: event.loaded, total, percent })
          },
        })

        return response.data as { success: boolean; jobId: string }
      } finally {
        clearTimeout(abortTimeoutId)
        if (warnTimeoutId) clearTimeout(warnTimeoutId)
        if (options.signal) {
          options.signal.removeEventListener('abort', handleExternalAbort)
        }
      }
    }

    let lastError: unknown = null

    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        return await attemptUpload()
      } catch (error) {
        lastError = error

        const isTimeout =
          axios.isAxiosError(error) &&
          (error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout'))
        const isCanceled =
          axios.isAxiosError(error) && (error.code === 'ERR_CANCELED' || error.name === 'CanceledError')

        if (isCanceled) {
          throw error
        }

        if (isTimeout && attempt < 1) {
          continue
        }

        if (isTimeout) {
          throw new Error('Upload demorou muito. Arquivo muito grande? Tente novamente.')
        }

        throw error
      }
    }

    throw lastError
  },

  /**
   * Consulta status de um job de transcricao.
   *
   * @param {string} jobId - ID do job
   * @returns {Promise<{ success: boolean; data: TranscriptionJob }>} Status do job
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  getStatus: (jobId: string): Promise<{ success: boolean; data: TranscriptionJob }> =>
    api.get(`/api/transcricao/${jobId}/status`),

  /**
   * Retorna resultado final da transcricao.
   *
   * @param {string} jobId - ID do job
   * @returns {Promise<unknown>} Resultado de transcricao
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  getResult: (jobId: string) => api.get(`/api/transcricao/${jobId}/resultado`),

  /**
   * Lista jobs de transcricao com filtros.
   *
   * @param {SessionsParams} [params] - Filtros e paginacao
   * @returns {Promise<{ success: boolean; data: TranscriptionJob[]; pagination: unknown }>} Lista de jobs
   * @throws {ApiError} Erro 401/500 em caso de falha
   */
  listJobs: (params?: SessionsParams): Promise<{ success: boolean; data: TranscriptionJob[]; pagination: unknown }> =>
    api.get('/api/transcricao/jobs', { params }),

  /**
   * Retorna estatisticas de transcricao.
   *
   * @returns {Promise<unknown>} Estatisticas agregadas
   * @throws {ApiError} Erro 401/500 em caso de falha
   */
  getStats: () => api.get('/api/transcricao/stats'),

  /**
   * Cancela ou remove um job de transcricao.
   *
   * @param {string} jobId - ID do job
   * @returns {Promise<unknown>} Resultado do cancelamento
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  cancel: (jobId: string) => api.delete(`/api/transcricao/${jobId}`),
  
  /**
   * Reprocessa um job falho ou travado.
   *
   * @param {string} jobId - ID do job
   * @returns {Promise<unknown>} Resultado do reprocessamento
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  restart: (jobId: string) => api.post(`/api/transcricao/${jobId}/restart`),

  /**
   * Lista sessoes disponiveis com URL de transmissao.
   *
   * @param {SessionsParams} [params] - Filtros e paginacao
   * @returns {Promise<{ success: boolean; data: unknown[] }>} Sessoes disponiveis
   * @throws {ApiError} Erro 401/500 em caso de falha
   */
  getAvailableSessions: (params?: SessionsParams): Promise<{ success: boolean; data: unknown[] }> =>
    api.get('/api/transcricao/sessoes-disponiveis', { params }),

  /**
   * Retorna lista de legislaturas para filtros.
   *
   * @returns {Promise<unknown>} Lista de legislaturas
   * @throws {ApiError} Erro 401/500 em caso de falha
   */
  getLegislaturas: () => api.get('/api/transcricao/legislaturas'),

  /**
   * Inicia transcricao para uma sessao especifica.
   *
   * @param {number} idSessao - ID da sessao
   * @param {{ segmented?: boolean }} [options] - Opcoes de transcricao
   * @returns {Promise<{ success: boolean; jobId: string }>} Job criado
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  transcribeSession: (idSessao: number, options?: { segmented?: boolean }): Promise<{ success: boolean; jobId: string }> =>
    api.post(`/api/transcricao/sessao/${idSessao}`, options),

  /**
   * Analisa transcricao finalizada usando DeepSeek Reasoner.
   *
   * Retorna resumo, pontos-chave e decisoes. IMPORTANTE: chama backend
   * diretamente para evitar timeout do proxy Next.js (~60s).
   *
   * @param {string} jobId - ID do job
   * @param {AnalyzeTranscriptionOptions} [options] - Opcoes de analise
   * @returns {Promise<{ success: boolean; data: TranscriptionAnalysis }>} Analise estruturada
   * @throws {Error} Erro de timeout ou falha de rede
   */
  analyzeTranscription: async (
    jobId: string,
    options: AnalyzeTranscriptionOptions = {}
  ): Promise<{ success: boolean; data: TranscriptionAnalysis }> => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
    // Use cached token from api client instead of direct localStorage access
    const token = api.getAuthToken()

    const controller = new AbortController()
    const handleExternalAbort = () => controller.abort()

    if (options.signal) {
      if (options.signal.aborted) {
        controller.abort()
      } else {
        options.signal.addEventListener('abort', handleExternalAbort)
      }
    }

    options.onProgress?.('Iniciando analise...')

    const heartbeatId = setInterval(() => {
      options.onProgress?.('Analise em andamento...')
    }, 30000)

    try {
      const response = await axios.post(
        `${backendUrl}/api/transcricao/${jobId}/analise`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
          },
          timeout: 300000,
          signal: controller.signal,
        }
      )

      options.onProgress?.('Analise concluida.')
      return response.data as { success: boolean; data: TranscriptionAnalysis }
    } catch (error) {
      const isTimeout =
        axios.isAxiosError(error) &&
        (error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout'))

      if (isTimeout) {
        options.onProgress?.('Tempo limite atingido. Tentando recuperar analise parcial...')

        try {
          const partial = await api.get<{ success: boolean; data: TranscriptionAnalysis }>(
            `/api/transcricao/${jobId}/analise`
          )

          if (partial?.success) {
            if (typeof window !== 'undefined') {
              // Use sessionStorage for temporary partial results (not auth-related)
              sessionStorage.setItem(
                `transcription-analysis-partial:${jobId}`,
                JSON.stringify(partial)
              )
            }
            return partial
          }
        } catch {
          // Ignore partial fetch errors and fall through
        }

        throw new Error('Analise demorou muito. Transcricao muito longa? Tente dividir em partes.')
      }

      throw error
    } finally {
      clearInterval(heartbeatId)
      if (options.signal) {
        options.signal.removeEventListener('abort', handleExternalAbort)
      }
    }
  },

  /**
   * Busca analise existente de um job.
   *
   * @param {string} jobId - ID do job
   * @returns {Promise<unknown>} Analise existente
   * @throws {ApiError} Erro 401/404 em caso de falha
   */
  getAnalysis: (jobId: string) =>
    api.get(`/api/transcricao/${jobId}/analise`),
}

/**
 * Servico admin para metricas, auditoria e monitoramento.
 *
 * Requer autenticacao e permissao de administrador.
 *
 * @namespace adminService
 * @example
 * ```ts
 * const conversations = await adminService.getConversations({
 *   page: 1,
 *   limit: 20,
 *   search: 'projeto',
 *   userId: '123'
 * })
 * ```
 */
export const adminService = {
  /**
   * Retorna estatisticas do dashboard admin.
   *
   * @param {AdminStatsParams} [params] - Intervalo de datas
   * @returns {Promise<{ success: boolean; data: unknown }>} Estatisticas agregadas
   * @throws {ApiError} Erro 401/403/500 em caso de falha
   */
  getStats: (params?: AdminStatsParams): Promise<{ success: boolean; data: unknown }> =>
    api.get('/api/admin/stats', {
      params: params ? { dateFrom: params.from, dateTo: params.to } : undefined
    }),

  /**
   * Retorna tendencias de uso por periodo.
   *
   * @param {'7d'|'30d'|'90d'} period - Periodo de analise
   * @returns {Promise<unknown>} Serie temporal de uso
   * @throws {ApiError} Erro 401/403/500 em caso de falha
   */
  getTrends: (period: '7d' | '30d' | '90d') =>
    api.get('/api/admin/stats/trends', { params: { period } }),

  /**
   * Lista conversas com filtros para auditoria.
   *
   * @param {ConversationsParams} [params] - Filtros e paginacao
   * @returns {Promise<{ success: boolean; data: Conversation[]; pagination: unknown }>} Conversas filtradas
   * @throws {ApiError} Erro 401/403/500 em caso de falha
   */
  getConversations: (params?: ConversationsParams): Promise<{ success: boolean; data: Conversation[]; pagination: unknown }> =>
    api.get('/api/admin/conversations', { params }),

  /**
   * Busca conversa especifica com mensagens.
   *
   * @param {string} id - ID da conversa
   * @returns {Promise<{ success: boolean; data: Conversation }>} Conversa detalhada
   * @throws {ApiError} Erro 401/403/404 em caso de falha
   */
  getConversation: (id: string): Promise<{ success: boolean; data: Conversation }> =>
    api.get<{ success: boolean; data: Conversation }>(`/api/admin/conversations/${id}`),

  /**
   * Exclui uma conversa.
   *
   * @param {string} id - ID da conversa
   * @returns {Promise<unknown>} Resultado da exclusao
   * @throws {ApiError} Erro 401/403/404 em caso de falha
   */
  deleteConversation: (id: string) =>
    api.delete(`/api/admin/conversations/${id}`),

  /**
   * Marca uma conversa para revisao ou treino de ML.
   *
   * @param {string} id - ID da conversa
   * @param {FlagConversationData} data - Dados de flag
   * @returns {Promise<{ success: boolean }>} Resultado da operacao
   * @throws {ApiError} Erro 401/403/404 em caso de falha
   */
  flagConversation: (id: string, data: FlagConversationData): Promise<{ success: boolean }> =>
    api.post(`/api/admin/conversations/${id}/flag`, data),

  /**
   * Exporta conversas em CSV ou JSON.
   *
   * @param {{ userId?: string; search?: string; dateFrom?: string; dateTo?: string }} params - Filtros de exportacao
   * @param {'csv'|'json'} format - Formato de exportacao
   * @returns {Promise<unknown>} Blob (csv) ou JSON
   * @throws {ApiError} Erro 401/403/500 em caso de falha
   */
  exportConversations: (
    params: {
      userId?: string
      search?: string
      dateFrom?: string
      dateTo?: string
    },
    format: 'csv' | 'json'
  ) =>
    api.get('/api/admin/conversations/export', {
      params: { ...params, format },
      responseType: format === 'csv' ? 'blob' : undefined,
    }),

  /**
   * Lista usuarios para administracao.
   *
   * @returns {Promise<{ success: boolean; data: User[] }>} Lista de usuarios
   * @throws {ApiError} Erro 401/403/500 em caso de falha
   */
  getUsers: (): Promise<{ success: boolean; data: User[] }> =>
    api.get<{ success: boolean; data: User[] }>('/api/admin/users'),

  /**
   * Retorna status de saude do sistema.
   *
   * @returns {Promise<{ success: boolean; data: HealthStatus }>} Status atual
   * @throws {ApiError} Erro 401/403/500 em caso de falha
   */
  getHealthStatus: (): Promise<{ success: boolean; data: HealthStatus }> => api.get('/api/admin/health/status'),

  /**
   * Retorna historico de saude para grafico.
   *
   * @param {number} [limit] - Limite de entradas
   * @returns {Promise<unknown>} Historico de saude
   * @throws {ApiError} Erro 401/403/500 em caso de falha
   */
  getHealthHistory: (limit?: number) =>
    api.get('/api/admin/health/history', { params: { limit } }),

  /**
   * Verifica se usuario atual e admin consultando endpoint protegido.
   *
   * @returns {Promise<boolean>} True quando acesso for permitido
   */
  checkIsAdmin: async () => {
    try {
      await api.get('/api/admin/stats')
      return true
    } catch {
      return false
    }
  },
}

/**
 * Servico admin de inteligencia conversacional.
 *
 * Requer autenticacao e permissao admin.
 *
 * @namespace adminIntelligenceService
 */
export const adminIntelligenceService = {
  /**
   * Retorna visao geral de inteligencia.
   *
   * @param {string} [period='30d'] - Periodo de analise (7d, 30d, 90d)
   * @returns {Promise<unknown>} Estatisticas de inteligencia
   * @throws {ApiError} Erro 401/403/500 em caso de falha
   */
  getOverview: (period: string = '30d') =>
    api.get('/api/admin/intelligence/overview', { params: { period } }),

  /**
   * Retorna perguntas mais frequentes.
   *
   * @param {string} [period='30d'] - Periodo de analise
   * @param {number} [limit=10] - Limite de perguntas
   * @returns {Promise<unknown>} Lista de perguntas e contagens
   * @throws {ApiError} Erro 401/403/500 em caso de falha
   */
  getTopQuestions: (period: string = '30d', limit: number = 10) =>
    api.get('/api/admin/intelligence/top-questions', { params: { period, limit } }),

  /**
   * Retorna metricas de confusao.
   *
   * @param {string} [period='30d'] - Periodo de analise
   * @returns {Promise<unknown>} Indicadores de confusao
   * @throws {ApiError} Erro 401/403/500 em caso de falha
   */
  getConfusionRate: (period: string = '30d') =>
    api.get('/api/admin/intelligence/confusion-rate', { params: { period } }),

  /**
   * Retorna tendencia de sentimento.
   *
   * @param {string} [period='30d'] - Periodo de analise
   * @returns {Promise<unknown>} Serie temporal de sentimento
   * @throws {ApiError} Erro 401/403/500 em caso de falha
   */
  getSentimentTrends: (period: string = '30d') =>
    api.get('/api/admin/intelligence/sentiment-trends', { params: { period } }),

  /**
   * Retorna distribuicao de intents.
   *
   * @param {string} [period='30d'] - Periodo de analise
   * @returns {Promise<unknown>} Estatisticas de intents
   * @throws {ApiError} Erro 401/403/500 em caso de falha
   */
  getIntentDistribution: (period: string = '30d') =>
    api.get('/api/admin/intelligence/intent-distribution', { params: { period } }),

  /**
   * Dispara reprocessamento das analises conversacionais.
   *
   * @returns {Promise<unknown>} Resultado do reprocessamento
   * @throws {ApiError} Erro 401/403/500 em caso de falha
   */
  triggerReprocess: () =>
    api.post('/api/admin/intelligence/reprocess'),

  /**
   * Retorna taxa de resolucao de conversas.
   *
   * @param {string} [period='30d'] - Periodo de analise
   * @returns {Promise<unknown>} Dados de taxa de resolucao
   * @throws {ApiError} Erro 401/403/500 em caso de falha
   */
  getResolutionRate: (period: string = '30d') =>
    api.get('/api/admin/intelligence/resolution-rate', { params: { period } }),

  /**
   * Retorna distribuicao de segmentos de usuarios.
   *
   * @param {string} [period='30d'] - Periodo de analise
   * @returns {Promise<unknown>} Dados de segmentos de usuarios
   * @throws {ApiError} Erro 401/403/500 em caso de falha
   */
  getUserSegments: (period: string = '30d') =>
    api.get('/api/admin/intelligence/user-segments', { params: { period } }),

  /**
   * Retorna eventos de confusao recentes.
   *
   * @param {string} [period='30d'] - Periodo de analise
   * @returns {Promise<unknown>} Dados de eventos de confusao
   * @throws {ApiError} Erro 401/403/500 em caso de falha
   */
  getRecentConfusions: (period: string = '30d') =>
    api.get('/api/admin/intelligence/recent-confusions', { params: { period } }),
}

/**
 * Servico admin de analise de dados via linguagem natural.
 *
 * Requer autenticacao e permissao admin.
 *
 * @namespace adminDataAnalystService
 */
export const adminDataAnalystService = {
  /**
   * Executa consulta em linguagem natural.
   *
   * @param {{ query: string; mode?: 'auto' | 'sql' | 'analysis' }} data - Dados da consulta
   * @returns {Promise<unknown>} Resultado da consulta
   * @throws {ApiError} Erro 401/403/500 em caso de falha
   */
  query: (data: { query: string; mode?: 'auto' | 'sql' | 'analysis' }) =>
    api.post('/api/admin/data-analyst/query', { question: data.query }),

  /**
   * Lista historico de consultas com paginacao.
   *
   * @param {Object} [params] - Filtros e paginacao
   * @param {number} [params.page] - Pagina atual
   * @param {number} [params.limit] - Itens por pagina
   * @param {string} [params.search] - Texto de busca
   * @param {boolean} [params.favoritesOnly] - Apenas favoritos
   * @returns {Promise<unknown>} Lista paginada de consultas
   * @throws {ApiError} Erro 401/403/500 em caso de falha
   */
  getHistory: (params?: {
    page?: number
    limit?: number
    search?: string
    favoritesOnly?: boolean
  }) => api.get('/api/admin/data-analyst/history', { params }),

  /**
   * Busca uma consulta por ID.
   *
   * @param {string} id - ID da consulta
   * @returns {Promise<unknown>} Resultado da consulta
   * @throws {ApiError} Erro 401/403/404 em caso de falha
   */
  getQuery: (id: string) => api.get(`/api/admin/data-analyst/history/${id}`),

  /**
   * Atualiza uma consulta (favorito, titulo).
   *
   * @param {string} id - ID da consulta
   * @param {{ isFavorite?: boolean; title?: string }} data - Dados para atualizacao
   * @returns {Promise<unknown>} Resultado da atualizacao
   * @throws {ApiError} Erro 401/403/404 em caso de falha
   */
  updateQuery: (id: string, data: { isFavorite?: boolean; title?: string }) =>
    api.patch(`/api/admin/data-analyst/history/${id}`, {
      is_favorite: data.isFavorite,
      title: data.title
    }),

  /**
   * Remove uma consulta do historico.
   *
   * @param {string} id - ID da consulta
   * @returns {Promise<unknown>} Resultado da exclusao
   * @throws {ApiError} Erro 401/403/404 em caso de falha
   */
  deleteQuery: (id: string) => api.delete(`/api/admin/data-analyst/history/${id}`),

  /**
   * Busca resultados paginados de uma consulta.
   * Usado para server-side pagination em tabelas grandes (>100 linhas).
   *
   * @param {string} id - ID da consulta
   * @param {Object} [params] - Parametros de paginacao
   * @param {number} [params.page] - Pagina atual (1-indexed, default: 1)
   * @param {number} [params.limit] - Itens por pagina (default: 50, max: 100)
   * @returns {Promise<{ data: unknown[], total: number, page: number, limit: number, totalPages: number }>}
   * @throws {ApiError} Erro 401/403/404 em caso de falha
   */
  getQueryResultsPaginated: (id: string, params?: { page?: number; limit?: number }) =>
    api.get<{ data: unknown[]; total: number; page: number; limit: number; totalPages: number }>(
      `/api/admin/data-analyst/history/${id}/results`,
      { params }
    ),

  /**
   * Retorna sugestoes de consultas.
   *
   * @param {Object} [params] - Parametros de filtro
   * @param {string} [params.period] - Periodo de analise ('7d' | '30d' | 'this_month')
   * @returns {Promise<unknown>} Sugestoes baseadas em uso
   * @throws {ApiError} Erro 401/403/500 em caso de falha
   */
  getSuggestions: (params?: { period?: '7d' | '30d' | 'this_month' }) =>
    api.get('/api/admin/data-analyst/suggestions', { params }),

  /**
   * Retorna insights automaticos baseados em dados.
   *
   * @param {Object} params - Parametros de filtro
   * @param {string} params.period - Periodo de analise ('7d' | '30d')
   * @returns {Promise<unknown>} Insights gerados automaticamente
   * @throws {ApiError} Erro 401/403/500 em caso de falha
   */
  getInsights: (params?: { period?: '7d' | '30d' }) =>
    api.get('/api/admin/data-analyst/insights', { params }),

  /**
   * Exporta resultado de consulta.
   *
   * @param {string} id - ID da consulta
   * @param {'csv'|'json'|'xlsx'} format - Formato de exportacao
   * @returns {Promise<unknown>} Blob (csv/xlsx) ou JSON
   * @throws {ApiError} Erro 401/403/404 em caso de falha
   */
  exportQuery: (id: string, format: 'csv' | 'json' | 'xlsx') =>
    api.get(`/api/admin/data-analyst/queries/${id}/export`, {
      params: { format },
      responseType: format === 'json' ? undefined : 'blob',
    }),

  /**
   * Salva consulta como relatorio rapido.
   *
   * @param {string} queryId - ID da consulta
   * @param {string} title - Titulo do relatorio
   * @returns {Promise<unknown>} Dados do quick report
   * @throws {ApiError} Erro 401/403/404 em caso de falha
   */
  saveAsQuickReport: (queryId: string, title: string) =>
    api.post('/api/admin/data-analyst/quick-reports', { queryId, title }),

  /**
   * Lista relatorios rapidos.
   *
   * @returns {Promise<unknown>} Lista de quick reports
   * @throws {ApiError} Erro 401/403/500 em caso de falha
   */
  getQuickReports: () =>
    api.get('/api/admin/data-analyst/quick-reports'),

  /**
   * Remove relatorio rapido.
   *
   * @param {string} id - ID do quick report
   * @returns {Promise<unknown>} Resultado da exclusao
   * @throws {ApiError} Erro 401/403/404 em caso de falha
   */
  deleteQuickReport: (id: string) =>
    api.delete(`/api/admin/data-analyst/quick-reports/${id}`),
}

// ============================================================================
// Re-export Security Utilities for Convenience
// ============================================================================

export {
  // Rate limiters
  apiRateLimiter,
  chatRateLimiter,
  uploadRateLimiter,
  analysisRateLimiter,
  RateLimitError,
} from './rate-limiter'

export type { RateLimiter } from './rate-limiter'
