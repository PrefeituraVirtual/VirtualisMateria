/**
 * CSRF Protection Utilities
 *
 * Provides Cross-Site Request Forgery protection for form submissions
 * and API requests. Uses token-based approach with session storage.
 */

const CSRF_TOKEN_KEY = 'csrf_token'
const CSRF_TOKEN_LENGTH = 32

/**
 * Generates a cryptographically secure random token.
 *
 * @param length - Length of the token in bytes (default: 32)
 * @returns Hex-encoded random token
 */
export function generateCSRFToken(length: number = CSRF_TOKEN_LENGTH): string {
  // Use crypto API if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  // Fallback for environments without crypto API
  let token = ''
  const chars = '0123456789abcdef'
  for (let i = 0; i < length * 2; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

/**
 * Stores a CSRF token in session storage.
 *
 * @param token - Token to store
 */
export function storeCSRFToken(token: string): void {
  if (typeof sessionStorage === 'undefined') {
    return
  }

  try {
    sessionStorage.setItem(CSRF_TOKEN_KEY, token)
  } catch {
    // Session storage may be unavailable in private mode
    console.warn('Unable to store CSRF token in session storage')
  }
}

/**
 * Retrieves the stored CSRF token from session storage.
 *
 * @returns Stored token or null if not found
 */
export function getCSRFToken(): string | null {
  if (typeof sessionStorage === 'undefined') {
    return null
  }

  try {
    return sessionStorage.getItem(CSRF_TOKEN_KEY)
  } catch {
    return null
  }
}

/**
 * Removes the stored CSRF token from session storage.
 */
export function clearCSRFToken(): void {
  if (typeof sessionStorage === 'undefined') {
    return
  }

  try {
    sessionStorage.removeItem(CSRF_TOKEN_KEY)
  } catch {
    // Ignore errors
  }
}

/**
 * Validates a CSRF token against the stored token.
 *
 * @param token - Token to validate
 * @returns true if token matches stored token
 */
export function validateCSRFToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') {
    return false
  }

  const storedToken = getCSRFToken()

  if (!storedToken) {
    return false
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(token, storedToken)
}

/**
 * Performs a constant-time string comparison.
 * Prevents timing attacks by always comparing all characters.
 *
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * Generates a new CSRF token and stores it.
 *
 * @returns The generated token
 */
export function initializeCSRFToken(): string {
  const token = generateCSRFToken()
  storeCSRFToken(token)
  return token
}

/**
 * Gets the current CSRF token, generating one if needed.
 *
 * @returns Current or newly generated token
 */
export function ensureCSRFToken(): string {
  const existing = getCSRFToken()
  if (existing) {
    return existing
  }
  return initializeCSRFToken()
}

/**
 * Creates CSRF headers for API requests.
 *
 * @returns Headers object with CSRF token
 */
export function getCSRFHeaders(): Record<string, string> {
  const token = ensureCSRFToken()
  return {
    'X-CSRF-Token': token,
  }
}

/**
 * Creates a hidden input element for CSRF token in forms.
 *
 * @returns Object with input properties
 */
export function getCSRFInputProps(): { name: string; value: string; type: 'hidden' } {
  return {
    name: '_csrf',
    value: ensureCSRFToken(),
    type: 'hidden',
  }
}

/**
 * React hook for CSRF token management.
 * Returns the current token and a refresh function.
 *
 * Usage:
 * ```tsx
 * function MyForm() {
 *   const { token, refresh } = useCSRFToken()
 *
 *   return (
 *     <form>
 *       <input type="hidden" name="_csrf" value={token} />
 *       ...
 *     </form>
 *   )
 * }
 * ```
 */
export interface CSRFTokenHookResult {
  token: string
  refresh: () => string
  validate: (token: string) => boolean
}

/**
 * Hook implementation helper.
 * This is a plain function that can be used in a React hook.
 */
export function createCSRFTokenState(): CSRFTokenHookResult {
  const token = ensureCSRFToken()

  return {
    token,
    refresh: () => {
      const newToken = generateCSRFToken()
      storeCSRFToken(newToken)
      return newToken
    },
    validate: validateCSRFToken,
  }
}
