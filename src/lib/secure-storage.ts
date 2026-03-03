/**
 * Secure Storage - Encrypted Client-Side Storage
 *
 * Provides encrypted storage for sensitive data like authentication tokens.
 * Uses Web Crypto API for AES-GCM encryption with session-based keys.
 *
 * Security considerations:
 * - Session key is cached in memory and persisted in sessionStorage (survives F5, cleared on tab close)
 * - This provides defense-in-depth against XSS token theft
 * - Not a replacement for HttpOnly cookies for truly sensitive tokens
 * - Adds expiration validation to prevent use of stale tokens
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Structure for encrypted storage items
 */
interface EncryptedItem {
  /** Base64-encoded encrypted data */
  ciphertext: string
  /** Base64-encoded initialization vector */
  iv: string
  /** Timestamp when the item expires (milliseconds since epoch) */
  expiresAt: number
  /** Version for future migration support */
  version: number
}

/**
 * Options for storing secure items
 */
export interface SecureStorageOptions {
  /** Time-to-live in milliseconds (default: 24 hours) */
  ttl?: number
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_VERSION = 1
const DEFAULT_TTL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
const STORAGE_PREFIX = '_secure_'
const SESSION_KEY_STORAGE = '_secure_session_key'

const isQuotaExceededError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false

  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )
  }

  const message = (error as Error).message || ''
  return message.toLowerCase().includes('quota')
}

// ============================================================================
// Session Key Management
// ============================================================================

/**
 * In-memory session encryption key (cache)
 * Persisted in sessionStorage to survive page refreshes (F5)
 * Cleared when the tab is closed (sessionStorage behavior)
 */
let sessionKey: CryptoKey | null = null

/**
 * Checks if Web Crypto API is available
 */
function isCryptoAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.crypto !== 'undefined' &&
    typeof window.crypto.subtle !== 'undefined'
  )
}

/**
 * Gets or creates the session encryption key.
 * On first call after a page refresh, recovers the key from sessionStorage.
 * If no key exists (new session), generates one and persists it.
 */
async function getSessionKey(): Promise<CryptoKey> {
  if (sessionKey) return sessionKey

  if (!isCryptoAvailable()) {
    throw new Error('Web Crypto API nao disponivel neste navegador.')
  }

  // Try to recover key from sessionStorage (survives F5)
  try {
    const stored = sessionStorage.getItem(SESSION_KEY_STORAGE)
    if (stored) {
      const rawBytes = base64ToArrayBuffer(stored)
      sessionKey = await crypto.subtle.importKey(
        'raw',
        rawBytes,
        { name: 'AES-GCM' },
        true, // extractable so we can persist it
        ['encrypt', 'decrypt']
      )
      return sessionKey
    }
  } catch {
    // sessionStorage unavailable or import failed — generate fresh key
  }

  // Generate new key (extractable so we can export to sessionStorage)
  sessionKey = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable — needed to persist in sessionStorage
    ['encrypt', 'decrypt']
  )

  // Persist raw key bytes in sessionStorage
  try {
    const exported = await crypto.subtle.exportKey('raw', sessionKey)
    sessionStorage.setItem(SESSION_KEY_STORAGE, arrayBufferToBase64(exported))
  } catch {
    // If sessionStorage write fails, key still works in-memory for this page load
  }

  return sessionKey
}

/**
 * Clears the session key from memory and sessionStorage
 * Called on logout or security events
 */
export function clearSessionKey(): void {
  sessionKey = null
  try {
    sessionStorage.removeItem(SESSION_KEY_STORAGE)
  } catch {
    // sessionStorage may be unavailable in some contexts
  }
}

// ============================================================================
// Encryption Utilities
// ============================================================================

/**
 * Converts ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Converts Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Encrypts data using AES-GCM
 */
async function encryptData(
  data: string,
  key: CryptoKey
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
  const encoder = new TextEncoder()
  const encodedData = encoder.encode(data)

  // Generate a random IV for each encryption
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encodedData
  )

  return { ciphertext, iv }
}

/**
 * Decrypts data using AES-GCM
 */
async function decryptData(
  ciphertext: ArrayBuffer,
  iv: Uint8Array,
  key: CryptoKey
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    ciphertext
  )

  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Stores an item securely in localStorage with encryption
 *
 * @param key - Storage key (will be prefixed with '_secure_')
 * @param value - Value to store (will be JSON stringified)
 * @param options - Storage options including TTL
 * @throws Error if encryption fails or storage is unavailable
 *
 * @example
 * await setSecureItem('authToken', token, { ttl: 3600000 }) // 1 hour TTL
 */
export async function setSecureItem<T>(
  key: string,
  value: T,
  options: SecureStorageOptions = {}
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Secure storage so funciona no navegador.')
  }

  if (!isCryptoAvailable()) {
    // Fallback: store without encryption (with warning)
    console.warn('[SecureStorage] Web Crypto indisponivel. Armazenando sem criptografia.')
    const item: EncryptedItem = {
      ciphertext: btoa(JSON.stringify(value)),
      iv: '',
      expiresAt: Date.now() + (options.ttl ?? DEFAULT_TTL),
      version: 0, // Version 0 indicates unencrypted fallback
    }
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(item))
    } catch (error) {
      if (isQuotaExceededError(error)) {
        return
      }
      throw error
    }
    return
  }

  const ttl = options.ttl ?? DEFAULT_TTL
  const expiresAt = Date.now() + ttl

  const sessionKeyValue = await getSessionKey()
  const serializedValue = JSON.stringify(value)
  const { ciphertext, iv } = await encryptData(serializedValue, sessionKeyValue)

  const item: EncryptedItem = {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    expiresAt,
    version: STORAGE_VERSION,
  }

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(item))
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return
    }
    throw error
  }
}

/**
 * Retrieves and decrypts an item from secure storage
 *
 * @param key - Storage key (will be prefixed with '_secure_')
 * @returns Decrypted value or null if not found/expired/invalid
 *
 * @example
 * const token = await getSecureItem<string>('authToken')
 */
export async function getSecureItem<T>(key: string): Promise<T | null> {
  if (typeof window === 'undefined') {
    return null
  }

  const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
  if (!stored) {
    return null
  }

  try {
    const item: EncryptedItem = JSON.parse(stored)

    // Check expiration
    if (item.expiresAt < Date.now()) {
      // Item has expired, remove it
      removeSecureItem(key)
      return null
    }

    // Handle unencrypted fallback (version 0)
    if (item.version === 0) {
      return JSON.parse(atob(item.ciphertext)) as T
    }

    // Decrypt the item
    if (!isCryptoAvailable()) {
      // Cannot decrypt without Crypto API
      console.warn('[SecureStorage] Nao e possivel descriptografar sem Web Crypto API.')
      return null
    }

    const sessionKeyValue = await getSessionKey()
    const ciphertext = base64ToArrayBuffer(item.ciphertext)
    const iv = new Uint8Array(base64ToArrayBuffer(item.iv))

    const decrypted = await decryptData(ciphertext, iv, sessionKeyValue)
    return JSON.parse(decrypted) as T
  } catch (error) {
    // Decryption failed (possibly due to new session key)
    console.warn('[SecureStorage] Falha ao descriptografar. Item sera removido.', error)
    removeSecureItem(key)
    return null
  }
}

/**
 * Removes an item from secure storage
 *
 * @param key - Storage key (will be prefixed with '_secure_')
 */
export function removeSecureItem(key: string): void {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.removeItem(`${STORAGE_PREFIX}${key}`)
}

/**
 * Clears all secure storage items
 * Use on logout or security events
 */
export function clearSecureStorage(): void {
  if (typeof window === 'undefined') {
    return
  }

  const keysToRemove: string[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key))
  clearSessionKey()
}

/**
 * Checks if an item exists and is not expired
 *
 * @param key - Storage key to check
 * @returns true if item exists and is valid
 */
export function hasSecureItem(key: string): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
  if (!stored) {
    return false
  }

  try {
    const item: EncryptedItem = JSON.parse(stored)
    return item.expiresAt > Date.now()
  } catch {
    return false
  }
}

/**
 * Gets the expiration time of a stored item
 *
 * @param key - Storage key to check
 * @returns Expiration timestamp in milliseconds, or null if not found
 */
export function getItemExpiration(key: string): number | null {
  if (typeof window === 'undefined') {
    return null
  }

  const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
  if (!stored) {
    return null
  }

  try {
    const item: EncryptedItem = JSON.parse(stored)
    return item.expiresAt
  } catch {
    return null
  }
}

/**
 * Extends the TTL of an existing item
 *
 * @param key - Storage key
 * @param additionalTtl - Additional time in milliseconds to add
 * @returns true if item was extended, false if not found
 */
export async function extendItemTtl(key: string, additionalTtl: number): Promise<boolean> {
  const value = await getSecureItem(key)
  if (value === null) {
    return false
  }

  const currentExpiration = getItemExpiration(key)
  if (!currentExpiration) {
    return false
  }

  const newTtl = currentExpiration - Date.now() + additionalTtl
  await setSecureItem(key, value, { ttl: newTtl })
  return true
}
