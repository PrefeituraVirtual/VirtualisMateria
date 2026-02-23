/**
 * AI Service - Direct Backend Communication
 *
 * This service bypasses the Next.js proxy for AI calls that may take a long time (60-90+ seconds).
 * The Next.js rewrite proxy has a default timeout that causes 500 errors for slow AI responses.
 *
 * By calling the backend directly, we can set appropriate timeouts for AI operations.
 */

import { getSecureItem } from './secure-storage'

// Direct backend URL - bypasses Next.js proxy to avoid timeout issues
let BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000'

// Safety check: ensure we are using port 4000 (backend), not 3001 (old default)
// This fixes issues where .env.local might still have the old port
if (BACKEND_URL.includes(':3001')) {
  console.warn('⚠️ AI Service: Detected incorrect port 3001 in BACKEND_URL, auto-correcting to 4000')
  BACKEND_URL = BACKEND_URL.replace(':3001', ':4000')
}

// FIX: Force IPv4 to avoid "Connection Refused" on systems where localhost resolves to ::1
// but the server is only listening on IPv4
if (process.env.NODE_ENV === 'development' && BACKEND_URL.includes('localhost')) {
  BACKEND_URL = BACKEND_URL.replace('localhost', '127.0.0.1')
}

interface AIRequestOptions {
  timeout?: number
  retries?: number
  onRetry?: (attempt: number, error: Error) => void
  signal?: AbortSignal
}

interface ChatSendRequest {
  message: string
  conversationId?: string
  mode?: 'standard' | 'deep' | 'r1' | 'sql'
  completeSearch?: boolean
}

interface ChatSendResponse {
  message: string
  conversationId?: string
  sources?: unknown[]
  metadata?: Record<string, unknown>
}

/**
 * Get auth token from secure storage
 * Uses the same secure storage as api.ts for consistency
 */
async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  return await getSecureItem<string>('authToken')
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Send a message to the AI chat endpoint directly to the backend
 * Bypasses Next.js proxy to handle long-running AI requests
 *
 * @param data - Chat request data
 * @param options - Request options including timeout and retry settings
 */
export async function sendAIMessage(
  data: ChatSendRequest,
  options: AIRequestOptions = {}
): Promise<ChatSendResponse> {
  const {
    timeout = 180000, // 3 minutes default for AI calls
    retries = 2,
    onRetry,
    signal
  } = options

  const token = await getAuthToken()

  let lastError: Error = new Error('Unknown error')

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const handleExternalAbort = () => {
        controller.abort()
      }

      if (signal) {
        if (signal.aborted) {
          controller.abort()
        } else {
          signal.addEventListener('abort', handleExternalAbort)
        }
      }

      try {
        const response = await fetch(`${BACKEND_URL}/api/chat/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify(data),
          signal: controller.signal
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
        }

        return await response.json()
      } finally {
        clearTimeout(timeoutId)
        if (signal) {
          signal.removeEventListener('abort', handleExternalAbort)
        }
      }

    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error('Unknown error')
      lastError = errorObj

      if (errorObj.name === 'AbortError') {
        if (signal?.aborted) {
          const cancelError = new Error('Requisicao cancelada pelo usuario.')
          cancelError.name = 'AbortError'
          throw cancelError
        }
        lastError = new Error('A requisicao excedeu o tempo limite. O modelo de IA pode estar sobrecarregado.')
      }

      // Only retry on network errors, not on explicit errors from the server
      const shouldRetry = attempt < retries &&
        (errorObj.name === 'AbortError' || errorObj.message.includes('fetch') || errorObj.message.includes('network')) &&
        !(signal?.aborted)

      if (shouldRetry) {
        if (onRetry) {
          onRetry(attempt + 1, lastError)
        }
        // Exponential backoff: 2s, 4s, 8s...
        await sleep(Math.pow(2, attempt + 1) * 1000)
        continue
      }

      throw lastError
    }
  }

  throw lastError
}

/**
 * Generate AI suggestions for legislative document creation
 * Uses deep mode with appropriate timeout and retry logic
 *
 * @param tema - Theme of the legislative document
 * @param tipo - Type of the document (PJL, REQ, etc.)
 * @param options - Additional options including callbacks for progress
 */
export async function generateLegislativeSuggestion(
  tema: string,
  tipo: string,
  options: {
    onProgress?: (stage: string) => void
    onRetry?: (attempt: number) => void
    timeout?: number
  } = {}
): Promise<{ ementa: string; assunto: string; texto_original: string }> {
  const { onProgress, onRetry, timeout = 180000 } = options

  const prompt = `
    Atue como um assistente legislativo experiente.
    Baseado no tema: "${tema}" e tipo: "${tipo}",
    Gere uma Ementa oficial, um Assunto detalhado e o Texto Completo do documento.

    IMPORTANTE: Verifique se ja existe legislacao sobre este tema.
    Se nao existir, crie o texto completo da lei/projeto.
    Se existir, baseie-se nela ou proponha alteracoes pertinentes.

    Responda APENAS com um objeto JSON no seguinte formato, sem markdown ou explicacoes adicionais:
    {
      "ementa": "Texto da ementa sugerida",
      "assunto": "Texto do assunto sugerido",
      "texto_original": "Texto completo do documento legislativo, incluindo artigos, paragrafos, justificativa, etc."
    }
  `

  if (onProgress) {
    onProgress('Enviando requisicao para o servidor de IA...')
  }

  const response = await sendAIMessage(
    {
      message: prompt,
      mode: 'deep'
    },
    {
      timeout,
      retries: 2,
      onRetry: (attempt) => {
        if (onRetry) onRetry(attempt)
        if (onProgress) {
          onProgress(`Tentativa ${attempt + 1} de conexao com o servidor...`)
        }
      }
    }
  )

  if (onProgress) {
    onProgress('Processando resposta da IA...')
  }

  // Parse the response
  let jsonStr = response.message

  // Extract from code blocks if present
  if (jsonStr.includes('```json')) {
    jsonStr = jsonStr.split('```json')[1].split('```')[0]
  } else if (jsonStr.includes('```')) {
    jsonStr = jsonStr.split('```')[1].split('```')[0]
  }

  // Find JSON object boundaries
  const firstOpen = jsonStr.indexOf('{')
  const lastClose = jsonStr.lastIndexOf('}')

  if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
    jsonStr = jsonStr.substring(firstOpen, lastClose + 1)
  }

  try {
    return JSON.parse(jsonStr)
  } catch (e) {
    console.error('Failed to parse AI response:', e)
    console.error('Raw response:', response.message)
    throw new Error('Erro ao processar resposta da IA. A resposta nao esta no formato esperado.')
  }
}

/**
 * AI Analysis service - direct backend calls
 */
export const aiService = {
  /**
   * Send chat message with automatic retry and proper timeout
   */
  chat: sendAIMessage,

  /**
   * Generate legislative document suggestion
   */
  generateLegislativeSuggestion,

  /**
   * Analyze content with AI (fast mode - can use proxy)
   */
  async analyzeQuick(query: string, _contextData?: Record<string, unknown>): Promise<ChatSendResponse> {
    return sendAIMessage({
      message: query,
      mode: 'standard'
    }, { timeout: 60000 }) // 1 minute for fast mode
  },

  /**
   * Analyze content with AI (deep mode - bypasses proxy)
   */
  async analyzeDeep(query: string, _contextData?: Record<string, unknown>): Promise<ChatSendResponse> {
    return sendAIMessage({
      message: query,
      mode: 'deep'
    }, { timeout: 180000 }) // 3 minutes for deep mode
  }
}

export default aiService
