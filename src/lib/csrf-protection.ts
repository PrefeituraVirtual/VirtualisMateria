/**
 * CSRF Protection - Cross-Site Request Forgery Prevention
 *
 * Provides CSRF token generation, storage, and validation utilities.
 * Implements the Synchronizer Token Pattern for CSRF protection.
 *
 * Security considerations:
 * - Tokens are stored in sessionStorage (cleared when tab closes)
 * - Tokens should be included in X-CSRF-Token header for state-changing requests
 * - Server must validate tokens for POST, PUT, DELETE, PATCH requests
 * - Tokens are regenerated periodically for security
 */

import { useCallback, useEffect, useState } from 'react'

// ============================================================================
// Constants
// ============================================================================

const CSRF_TOKEN_KEY = '_csrf_token'
const CSRF_TOKEN_TIMESTAMP_KEY = '_csrf_token_timestamp'
const TOKEN_EXPIRY_MS = 30 * 60 * 1000 // 30 minutes

// ============================================================================
// Token Generation
// ============================================================================

/**
 * Generates a cryptographically secure CSRF token
 *
 * Uses crypto.randomUUID() which provides 122 bits of randomness.
 * Falls back to a custom implementation if randomUUID is unavailable.
 *
 * @returns A unique CSRF token string
 */
export function generateCSRFToken(): string {
  // Prefer crypto.randomUUID() for best security
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // Fallback for older browsers
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)

    // Format as UUID-like string
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  // Last resort fallback (not recommended for production)
  console.warn('[CSRF] crypto.randomUUID e crypto.getRandomValues indisponiveis. Usando fallback menos seguro.')
  return `${Date.now()}-${Math.random().toString(36).substring(2)}-${Math.random().toString(36).substring(2)}`
}

// ============================================================================
// Token Storage
// ============================================================================

/**
 * Stores a CSRF token in sessionStorage
 *
 * @param token - The CSRF token to store
 */
export function storeCSRFToken(token: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    sessionStorage.setItem(CSRF_TOKEN_KEY, token)
    sessionStorage.setItem(CSRF_TOKEN_TIMESTAMP_KEY, Date.now().toString())
  } catch (error) {
    console.error('[CSRF] Falha ao armazenar token:', error)
  }
}

/**
 * Retrieves the stored CSRF token
 *
 * Automatically generates a new token if:
 * - No token exists
 * - Token has expired
 *
 * @returns The CSRF token or null if unavailable
 */
export function getCSRFToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const token = sessionStorage.getItem(CSRF_TOKEN_KEY)
    const timestamp = sessionStorage.getItem(CSRF_TOKEN_TIMESTAMP_KEY)

    // Check if token exists and is not expired
    if (token && timestamp) {
      const tokenAge = Date.now() - parseInt(timestamp, 10)
      if (tokenAge < TOKEN_EXPIRY_MS) {
        return token
      }
    }

    // Token missing or expired - generate new one
    const newToken = generateCSRFToken()
    storeCSRFToken(newToken)
    return newToken
  } catch (error) {
    console.error('[CSRF] Falha ao recuperar token:', error)
    return null
  }
}

/**
 * Removes the stored CSRF token
 * Call on logout or security events
 */
export function clearCSRFToken(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    sessionStorage.removeItem(CSRF_TOKEN_KEY)
    sessionStorage.removeItem(CSRF_TOKEN_TIMESTAMP_KEY)
  } catch (error) {
    console.error('[CSRF] Falha ao limpar token:', error)
  }
}

/**
 * Refreshes the CSRF token by generating a new one
 *
 * @returns The new CSRF token
 */
export function refreshCSRFToken(): string {
  const newToken = generateCSRFToken()
  storeCSRFToken(newToken)
  return newToken
}

// ============================================================================
// Token Validation
// ============================================================================

/**
 * Validates a CSRF token against the stored token
 *
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param token - The token to validate
 * @returns true if the token is valid, false otherwise
 */
export function validateCSRFToken(token: string | null | undefined): boolean {
  if (!token) {
    return false
  }

  const storedToken = getCSRFToken()
  if (!storedToken) {
    return false
  }

  // Constant-time comparison to prevent timing attacks
  return constantTimeCompare(token, storedToken)
}

/**
 * Performs constant-time string comparison
 * Prevents timing attacks by always comparing all characters
 *
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

// ============================================================================
// React Hook
// ============================================================================

/**
 * React hook for CSRF token management
 *
 * Provides the current CSRF token and a function to refresh it.
 * Automatically initializes the token on mount.
 *
 * @returns Object with token and refresh function
 *
 * @example
 * function MyForm() {
 *   const { token, refresh } = useCSRFToken()
 *
 *   const handleSubmit = async (data) => {
 *     await api.post('/api/data', data, {
 *       headers: { 'X-CSRF-Token': token }
 *     })
 *   }
 *
 *   return <form onSubmit={handleSubmit}>...</form>
 * }
 */
export function useCSRFToken(): {
  token: string | null
  refresh: () => string
  isReady: boolean
} {
  const [token, setToken] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Initialize token on mount
  useEffect(() => {
    const currentToken = getCSRFToken()
    setToken(currentToken)
    setIsReady(true)
  }, [])

  // Refresh function
  const refresh = useCallback((): string => {
    const newToken = refreshCSRFToken()
    setToken(newToken)
    return newToken
  }, [])

  return {
    token,
    refresh,
    isReady,
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Headers object with CSRF token
 */
export interface CSRFHeaders {
  'X-CSRF-Token': string
}

/**
 * Gets headers object with CSRF token
 * Convenient for use with fetch or axios
 *
 * @returns Headers object with CSRF token
 */
export function getCSRFHeaders(): CSRFHeaders | Record<string, never> {
  const token = getCSRFToken()
  if (!token) {
    return {}
  }

  return {
    'X-CSRF-Token': token,
  }
}

/**
 * Determines if a request method requires CSRF protection
 *
 * @param method - HTTP method (GET, POST, etc.)
 * @returns true if CSRF protection is required
 */
export function requiresCSRFProtection(method: string): boolean {
  const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH']
  return protectedMethods.includes(method.toUpperCase())
}
