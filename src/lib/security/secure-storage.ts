/**
 * Secure Storage Utilities
 *
 * Provides encrypted storage for sensitive client-side data.
 * Uses AES-GCM encryption with Web Crypto API.
 */

const STORAGE_PREFIX = 'secure_'
const ENCRYPTION_KEY_NAME = 'encryption_key'
const IV_LENGTH = 12 // 96 bits for AES-GCM

/**
 * Storage item with metadata.
 */
interface SecureStorageItem {
  data: string // Base64 encoded encrypted data
  iv: string // Base64 encoded IV
  timestamp: number
  expiresAt?: number
}

/**
 * Converts ArrayBuffer to Base64 string.
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
 * Converts Base64 string to ArrayBuffer.
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
 * Generates or retrieves the encryption key.
 * Key is stored in sessionStorage for the session duration.
 */
async function getEncryptionKey(): Promise<CryptoKey | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return null
  }

  try {
    // Check for existing key in session
    const storedKey = sessionStorage.getItem(ENCRYPTION_KEY_NAME)

    if (storedKey) {
      const keyData = base64ToArrayBuffer(storedKey)
      return await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        true,
        ['encrypt', 'decrypt']
      )
    }

    // Generate new key
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )

    // Export and store key
    const exportedKey = await crypto.subtle.exportKey('raw', key)
    sessionStorage.setItem(ENCRYPTION_KEY_NAME, arrayBufferToBase64(exportedKey))

    return key
  } catch {
    return null
  }
}

/**
 * Encrypts a value using AES-GCM.
 *
 * @param value - Value to encrypt
 * @param key - Encryption key
 * @returns Encrypted data and IV
 */
async function encrypt(
  value: string,
  key: CryptoKey
): Promise<{ data: string; iv: string }> {
  const encoder = new TextEncoder()
  const data = encoder.encode(value)
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )

  return {
    data: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
  }
}

/**
 * Decrypts a value using AES-GCM.
 *
 * @param encryptedData - Base64 encoded encrypted data
 * @param iv - Base64 encoded IV
 * @param key - Encryption key
 * @returns Decrypted string
 */
async function decrypt(
  encryptedData: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const data = base64ToArrayBuffer(encryptedData)
  const ivBuffer = base64ToArrayBuffer(iv)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
    key,
    data
  )

  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

/**
 * Stores a value securely in localStorage with encryption.
 *
 * @param key - Storage key
 * @param value - Value to store
 * @param ttlMs - Optional time-to-live in milliseconds
 */
export async function setSecureItem(
  key: string,
  value: string,
  ttlMs?: number
): Promise<boolean> {
  if (typeof localStorage === 'undefined') {
    return false
  }

  try {
    const encryptionKey = await getEncryptionKey()

    if (!encryptionKey) {
      // Fallback: store without encryption (with warning)
      console.warn('Encryption not available, storing in plain text')
      const item: SecureStorageItem = {
        data: btoa(value),
        iv: '',
        timestamp: Date.now(),
        expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
      }
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(item))
      return true
    }

    const { data, iv } = await encrypt(value, encryptionKey)

    const item: SecureStorageItem = {
      data,
      iv,
      timestamp: Date.now(),
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
    }

    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(item))
    return true
  } catch (error) {
    console.error('Failed to store secure item:', error)
    return false
  }
}

/**
 * Retrieves and decrypts a value from localStorage.
 *
 * @param key - Storage key
 * @returns Decrypted value or null if not found/expired/corrupted
 */
export async function getSecureItem(key: string): Promise<string | null> {
  if (typeof localStorage === 'undefined') {
    return null
  }

  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + key)

    if (!stored) {
      return null
    }

    const item: SecureStorageItem = JSON.parse(stored)

    // Check expiration
    if (item.expiresAt && Date.now() > item.expiresAt) {
      await removeSecureItem(key)
      return null
    }

    const encryptionKey = await getEncryptionKey()

    if (!encryptionKey) {
      // Fallback: decode without decryption
      if (!item.iv) {
        return atob(item.data)
      }
      return null
    }

    // Handle unencrypted fallback data
    if (!item.iv) {
      return atob(item.data)
    }

    return await decrypt(item.data, item.iv, encryptionKey)
  } catch (error) {
    console.error('Failed to retrieve secure item:', error)
    return null
  }
}

/**
 * Removes a secure item from localStorage.
 *
 * @param key - Storage key
 */
export async function removeSecureItem(key: string): Promise<void> {
  if (typeof localStorage === 'undefined') {
    return
  }

  try {
    localStorage.removeItem(STORAGE_PREFIX + key)
  } catch {
    // Ignore errors
  }
}

/**
 * Clears all secure items from localStorage.
 */
export async function clearSecureStorage(): Promise<void> {
  if (typeof localStorage === 'undefined') {
    return
  }

  try {
    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key)
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key)
    }

    // Also clear the encryption key
    sessionStorage.removeItem(ENCRYPTION_KEY_NAME)
  } catch {
    // Ignore errors
  }
}

/**
 * Checks if an item exists and is not expired.
 *
 * @param key - Storage key
 * @returns true if item exists and is valid
 */
export async function hasSecureItem(key: string): Promise<boolean> {
  if (typeof localStorage === 'undefined') {
    return false
  }

  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + key)

    if (!stored) {
      return false
    }

    const item: SecureStorageItem = JSON.parse(stored)

    // Check expiration
    if (item.expiresAt && Date.now() > item.expiresAt) {
      await removeSecureItem(key)
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Gets metadata about a stored item without decrypting.
 *
 * @param key - Storage key
 * @returns Metadata or null
 */
export function getSecureItemMetadata(
  key: string
): { timestamp: number; expiresAt?: number; isEncrypted: boolean } | null {
  if (typeof localStorage === 'undefined') {
    return null
  }

  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + key)

    if (!stored) {
      return null
    }

    const item: SecureStorageItem = JSON.parse(stored)

    return {
      timestamp: item.timestamp,
      expiresAt: item.expiresAt,
      isEncrypted: !!item.iv,
    }
  } catch {
    return null
  }
}

/**
 * Checks if secure storage (encryption) is available.
 *
 * @returns true if Web Crypto API is available
 */
export function isSecureStorageAvailable(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof localStorage !== 'undefined' &&
    typeof sessionStorage !== 'undefined'
  )
}
