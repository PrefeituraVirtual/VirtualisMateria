/**
 * Secure Storage Tests
 *
 * Comprehensive tests for encrypted storage functionality.
 * Tests cover encryption, expiration, and error handling.
 */

// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  setSecureItem,
  getSecureItem,
  removeSecureItem,
  clearSecureStorage,
  hasSecureItem,
  getSecureItemMetadata,
  isSecureStorageAvailable,
} from '@/lib/security/secure-storage'

describe('Secure Storage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('setSecureItem() and getSecureItem()', () => {
    it('should store and retrieve a value successfully', async () => {
      const key = 'test-key'
      const value = 'test-value'

      await setSecureItem(key, value)
      const retrieved = await getSecureItem(key)

      expect(retrieved).toBe(value)
    })

    it('should handle JSON data', async () => {
      const key = 'json-key'
      const value = JSON.stringify({ name: 'Test', count: 42 })

      await setSecureItem(key, value)
      const retrieved = await getSecureItem(key)

      expect(retrieved).toBe(value)
      expect(JSON.parse(retrieved!)).toEqual({ name: 'Test', count: 42 })
    })

    it('should handle empty string', async () => {
      await setSecureItem('empty', '')
      const retrieved = await getSecureItem('empty')

      expect(retrieved).toBe('')
    })

    it('should handle special characters', async () => {
      const value = 'Special chars: <>&"\' and unicode: '
      await setSecureItem('special', value)
      const retrieved = await getSecureItem('special')

      expect(retrieved).toBe(value)
    })

    it('should handle long strings', async () => {
      const value = 'a'.repeat(10000)
      await setSecureItem('long', value)
      const retrieved = await getSecureItem('long')

      expect(retrieved).toBe(value)
    })

    it('should return null for non-existent key', async () => {
      const result = await getSecureItem('non-existent-key')

      expect(result).toBeNull()
    })
  })

  describe('encryption', () => {
    it('should not store value as plain text in localStorage', async () => {
      const key = 'encrypted-key'
      const value = 'sensitive-data-that-should-be-encrypted'

      await setSecureItem(key, value)

      // Check what's actually stored
      const storedRaw = localStorage.getItem('secure_' + key)
      expect(storedRaw).not.toBeNull()

      // The stored value should not contain the original plain text
      expect(storedRaw).not.toContain(value)
    })

    it('should store item with encrypted data structure', async () => {
      await setSecureItem('struct-key', 'test-value')

      const storedRaw = localStorage.getItem('secure_struct-key')
      const stored = JSON.parse(storedRaw!)

      // Should have expected structure
      expect(stored).toHaveProperty('data')
      expect(stored).toHaveProperty('timestamp')
      expect(typeof stored.data).toBe('string')
      expect(typeof stored.timestamp).toBe('number')
    })

    it('should use different encryption for same value stored twice', async () => {
      const value = 'same-value'

      // Clear and reset encryption key
      sessionStorage.clear()

      await setSecureItem('key1', value)
      const stored1 = localStorage.getItem('secure_key1')

      // Clear encryption key to force new key generation
      sessionStorage.clear()

      await setSecureItem('key2', value)
      const stored2 = localStorage.getItem('secure_key2')

      // Parse and compare data fields (should be different due to different IV/key)
      const parsed1 = JSON.parse(stored1!)
      const parsed2 = JSON.parse(stored2!)

      // Even if the same value, encrypted data should differ
      // (due to random IV, even with same key)
      expect(parsed1.data).not.toBe(parsed2.data)
    })
  })

  describe('removeSecureItem()', () => {
    it('should remove stored item', async () => {
      await setSecureItem('to-remove', 'value')
      expect(await getSecureItem('to-remove')).toBe('value')

      await removeSecureItem('to-remove')
      expect(await getSecureItem('to-remove')).toBeNull()
    })

    it('should not throw for non-existent key', async () => {
      await expect(removeSecureItem('non-existent')).resolves.not.toThrow()
    })
  })

  describe('expiration validation', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return value before expiration', async () => {
      await setSecureItem('expiring', 'value', 60000) // 1 minute TTL

      vi.advanceTimersByTime(30000) // 30 seconds

      const result = await getSecureItem('expiring')
      expect(result).toBe('value')
    })

    it('should return null after expiration', async () => {
      await setSecureItem('expiring', 'value', 60000) // 1 minute TTL

      vi.advanceTimersByTime(61000) // 61 seconds

      const result = await getSecureItem('expiring')
      expect(result).toBeNull()
    })

    it('should remove expired item from storage', async () => {
      await setSecureItem('expiring', 'value', 60000)

      vi.advanceTimersByTime(61000)

      await getSecureItem('expiring')

      // Item should be removed
      expect(localStorage.getItem('secure_expiring')).toBeNull()
    })

    it('should handle item without expiration', async () => {
      await setSecureItem('no-expiry', 'value') // No TTL

      vi.advanceTimersByTime(365 * 24 * 60 * 60 * 1000) // 1 year

      const result = await getSecureItem('no-expiry')
      expect(result).toBe('value')
    })
  })

  describe('handling of corrupted data', () => {
    it('should return null for corrupted JSON', async () => {
      localStorage.setItem('secure_corrupted', 'not-valid-json')

      const result = await getSecureItem('corrupted')
      expect(result).toBeNull()
    })

    it('should return null for missing data field', async () => {
      localStorage.setItem(
        'secure_missing-data',
        JSON.stringify({ timestamp: Date.now() })
      )

      const result = await getSecureItem('missing-data')
      expect(result).toBeNull()
    })

    it('should handle corrupted encrypted data', async () => {
      localStorage.setItem(
        'secure_corrupted-crypto',
        JSON.stringify({
          data: 'invalid-base64-data!!!',
          iv: 'also-invalid!!!',
          timestamp: Date.now(),
        })
      )

      const result = await getSecureItem('corrupted-crypto')
      expect(result).toBeNull()
    })
  })

  describe('clearSecureStorage()', () => {
    it('should clear all secure items', async () => {
      await setSecureItem('key1', 'value1')
      await setSecureItem('key2', 'value2')
      await setSecureItem('key3', 'value3')

      await clearSecureStorage()

      expect(await getSecureItem('key1')).toBeNull()
      expect(await getSecureItem('key2')).toBeNull()
      expect(await getSecureItem('key3')).toBeNull()
    })

    it('should only clear secure items (with prefix)', async () => {
      await setSecureItem('secure-key', 'secure-value')
      localStorage.setItem('regular-key', 'regular-value')

      await clearSecureStorage()

      expect(await getSecureItem('secure-key')).toBeNull()
      expect(localStorage.getItem('regular-key')).toBe('regular-value')
    })

    it('should clear encryption key from sessionStorage', async () => {
      await setSecureItem('key', 'value')
      expect(sessionStorage.getItem('encryption_key')).not.toBeNull()

      await clearSecureStorage()

      expect(sessionStorage.getItem('encryption_key')).toBeNull()
    })
  })

  describe('hasSecureItem()', () => {
    it('should return true for existing item', async () => {
      await setSecureItem('exists', 'value')

      const result = await hasSecureItem('exists')
      expect(result).toBe(true)
    })

    it('should return false for non-existent item', async () => {
      const result = await hasSecureItem('not-exists')
      expect(result).toBe(false)
    })

    it('should return false for expired item', async () => {
      vi.useFakeTimers()

      await setSecureItem('expiring', 'value', 1000)
      vi.advanceTimersByTime(2000)

      const result = await hasSecureItem('expiring')
      expect(result).toBe(false)

      vi.useRealTimers()
    })
  })

  describe('getSecureItemMetadata()', () => {
    it('should return metadata for existing item', async () => {
      const beforeTime = Date.now()
      await setSecureItem('meta-key', 'value')
      const afterTime = Date.now()

      const metadata = getSecureItemMetadata('meta-key')

      expect(metadata).not.toBeNull()
      expect(metadata!.timestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(metadata!.timestamp).toBeLessThanOrEqual(afterTime)
    })

    it('should return expiration time when set', async () => {
      vi.useFakeTimers()
      const now = Date.now()
      vi.setSystemTime(now)

      await setSecureItem('expiring-meta', 'value', 60000)

      const metadata = getSecureItemMetadata('expiring-meta')

      expect(metadata).not.toBeNull()
      expect(metadata!.expiresAt).toBe(now + 60000)

      vi.useRealTimers()
    })

    it('should return isEncrypted flag', async () => {
      await setSecureItem('encrypted-meta', 'value')

      const metadata = getSecureItemMetadata('encrypted-meta')

      expect(metadata).not.toBeNull()
      expect(typeof metadata!.isEncrypted).toBe('boolean')
    })

    it('should return null for non-existent key', () => {
      const metadata = getSecureItemMetadata('non-existent')
      expect(metadata).toBeNull()
    })

    it('should return null for corrupted data', () => {
      localStorage.setItem('secure_corrupted-meta', 'not-json')

      const metadata = getSecureItemMetadata('corrupted-meta')
      expect(metadata).toBeNull()
    })
  })

  describe('isSecureStorageAvailable()', () => {
    it('should return true when crypto and storage are available', () => {
      expect(isSecureStorageAvailable()).toBe(true)
    })

    it('should check for crypto.subtle availability', () => {
      // In jsdom environment, crypto.subtle should be available
      expect(typeof crypto.subtle).toBe('object')
    })
  })

  describe('handling missing encryption key', () => {
    it('should handle session with missing encryption key', async () => {
      await setSecureItem('key', 'value')

      // Clear only the encryption key
      sessionStorage.removeItem('encryption_key')

      // Getting the item should either:
      // - Return null (if encrypted and key is lost)
      // - Generate new key and fail to decrypt old data
      // The exact behavior depends on implementation
      const result = await getSecureItem('key')

      // With the current implementation, a new key will be generated
      // and decryption will fail, returning null
      expect(result).toBeNull()
    })
  })

  describe('overwriting values', () => {
    it('should overwrite existing value', async () => {
      await setSecureItem('overwrite', 'first')
      expect(await getSecureItem('overwrite')).toBe('first')

      await setSecureItem('overwrite', 'second')
      expect(await getSecureItem('overwrite')).toBe('second')
    })

    it('should update expiration on overwrite', async () => {
      vi.useFakeTimers()

      await setSecureItem('expiry-update', 'value', 60000)
      vi.advanceTimersByTime(50000) // 50 seconds

      // Update with new expiration
      await setSecureItem('expiry-update', 'new-value', 60000)
      vi.advanceTimersByTime(50000) // Another 50 seconds (100 total from start)

      // Should still be valid (new 60 second TTL started at 50 seconds)
      const result = await getSecureItem('expiry-update')
      expect(result).toBe('new-value')

      vi.useRealTimers()
    })
  })

  describe('sequential operations', () => {
    it('should handle multiple sequential sets', async () => {
      // Set items sequentially to avoid race conditions with encryption key generation
      await setSecureItem('seq1', 'value1')
      await setSecureItem('seq2', 'value2')
      await setSecureItem('seq3', 'value3')

      expect(await getSecureItem('seq1')).toBe('value1')
      expect(await getSecureItem('seq2')).toBe('value2')
      expect(await getSecureItem('seq3')).toBe('value3')
    })

    it('should handle multiple gets after sets', async () => {
      await setSecureItem('get1', 'value1')
      await setSecureItem('get2', 'value2')
      await setSecureItem('get3', 'value3')

      const v1 = await getSecureItem('get1')
      const v2 = await getSecureItem('get2')
      const v3 = await getSecureItem('get3')

      expect(v1).toBe('value1')
      expect(v2).toBe('value2')
      expect(v3).toBe('value3')
    })
  })

  describe('localStorage unavailable', () => {
    it('should return false from setSecureItem when localStorage unavailable', async () => {
      const originalLocalStorage = global.localStorage
      // @ts-expect-error - testing undefined localStorage
      delete global.localStorage

      const result = await setSecureItem('key', 'value')
      expect(result).toBe(false)

      global.localStorage = originalLocalStorage
    })

    it('should return null from getSecureItem when localStorage unavailable', async () => {
      const originalLocalStorage = global.localStorage
      // @ts-expect-error - testing undefined localStorage
      delete global.localStorage

      const result = await getSecureItem('key')
      expect(result).toBeNull()

      global.localStorage = originalLocalStorage
    })
  })

  describe('key prefixing', () => {
    it('should prefix keys with secure_', async () => {
      await setSecureItem('my-key', 'value')

      expect(localStorage.getItem('secure_my-key')).not.toBeNull()
      expect(localStorage.getItem('my-key')).toBeNull()
    })
  })
})
