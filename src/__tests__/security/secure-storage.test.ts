/**
 * Secure Storage Tests
 *
 * Testa a funcionalidade de armazenamento criptografado.
 * Valida criptografia, expiração e tratamento de erros.
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
import { clearSessionKey } from '@/lib/secure-storage'

describe('Secure Storage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    clearSessionKey()
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
      const retrieved = await getSecureItem<string>(key)

      expect(retrieved).toBe(value)
    })

    it('should handle JSON data', async () => {
      const key = 'json-key'
      const value = JSON.stringify({ name: 'Test', count: 42 })

      await setSecureItem(key, value)
      const retrieved = await getSecureItem<string>(key)

      expect(retrieved).toBe(value)
      expect(JSON.parse(retrieved!)).toEqual({ name: 'Test', count: 42 })
    })

    it('should handle empty string', async () => {
      await setSecureItem('empty', '')
      const retrieved = await getSecureItem<string>('empty')

      expect(retrieved).toBe('')
    })

    it('should handle special characters', async () => {
      const value = 'Special chars: <>&"\' and unicode: 😀'
      await setSecureItem('special', value)
      const retrieved = await getSecureItem<string>('special')

      expect(retrieved).toBe(value)
    })

    it('should handle long strings', async () => {
      const value = 'a'.repeat(10000)
      await setSecureItem('long', value)
      const retrieved = await getSecureItem<string>('long')

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

      const storedRaw = localStorage.getItem('_secure_' + key)
      expect(storedRaw).not.toBeNull()
      expect(storedRaw).not.toContain(value)
    })

    it('should store item with encrypted data structure', async () => {
      await setSecureItem('struct-key', 'test-value')

      const storedRaw = localStorage.getItem('_secure_struct-key')
      const stored = JSON.parse(storedRaw!)

      expect(stored).toHaveProperty('ciphertext')
      expect(stored).toHaveProperty('expiresAt')
      expect(typeof stored.ciphertext).toBe('string')
      expect(typeof stored.expiresAt).toBe('number')
    })

    it('should use different encryption for same value stored twice', async () => {
      const value = 'same-value'

      sessionStorage.clear()
      clearSessionKey()
      await setSecureItem('key1', value)
      const stored1 = localStorage.getItem('_secure_key1')

      sessionStorage.clear()
      clearSessionKey()
      await setSecureItem('key2', value)
      const stored2 = localStorage.getItem('_secure_key2')

      const parsed1 = JSON.parse(stored1!)
      const parsed2 = JSON.parse(stored2!)

      expect(parsed1.ciphertext).not.toBe(parsed2.ciphertext)
    })
  })

  describe('removeSecureItem()', () => {
    it('should remove stored item', async () => {
      await setSecureItem('to-remove', 'value')
      expect(await getSecureItem<string>('to-remove')).toBe('value')

      removeSecureItem('to-remove')
      expect(await getSecureItem('to-remove')).toBeNull()
    })

    it('should not throw for non-existent key', () => {
      expect(() => removeSecureItem('non-existent')).not.toThrow()
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
      await setSecureItem('expiring', 'value', { ttl: 60000 })

      vi.advanceTimersByTime(30000)

      const result = await getSecureItem<string>('expiring')
      expect(result).toBe('value')
    })

    it('should return null after expiration', async () => {
      await setSecureItem('expiring', 'value', { ttl: 60000 })

      vi.advanceTimersByTime(61000)

      const result = await getSecureItem('expiring')
      expect(result).toBeNull()
    })

    it('should remove expired item from storage', async () => {
      await setSecureItem('expiring', 'value', { ttl: 60000 })

      vi.advanceTimersByTime(61000)

      await getSecureItem('expiring')

      expect(localStorage.getItem('_secure_expiring')).toBeNull()
    })

    it('should use default TTL of 24 hours', async () => {
      await setSecureItem('default-ttl', 'value')

      vi.advanceTimersByTime(23 * 60 * 60 * 1000) // 23 horas
      expect(await getSecureItem<string>('default-ttl')).toBe('value')

      vi.advanceTimersByTime(2 * 60 * 60 * 1000) // +2h (25h total)
      expect(await getSecureItem('default-ttl')).toBeNull()
    })
  })

  describe('handling of corrupted data', () => {
    it('should return null for corrupted JSON', async () => {
      localStorage.setItem('_secure_corrupted', 'not-valid-json')

      const result = await getSecureItem('corrupted')
      expect(result).toBeNull()
    })

    it('should return null for missing data field', async () => {
      localStorage.setItem(
        '_secure_missing-data',
        JSON.stringify({ timestamp: Date.now() })
      )

      const result = await getSecureItem('missing-data')
      expect(result).toBeNull()
    })

    it('should handle corrupted encrypted data', async () => {
      localStorage.setItem(
        '_secure_corrupted-crypto',
        JSON.stringify({
          ciphertext: 'invalid-base64-data!!!',
          iv: 'also-invalid!!!',
          expiresAt: Date.now() + 60000,
          version: 1,
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

      clearSecureStorage()

      expect(await getSecureItem('key1')).toBeNull()
      expect(await getSecureItem('key2')).toBeNull()
      expect(await getSecureItem('key3')).toBeNull()
    })

    it('should only clear secure items (with prefix)', async () => {
      await setSecureItem('secure-key', 'secure-value')
      localStorage.setItem('regular-key', 'regular-value')

      clearSecureStorage()

      expect(await getSecureItem('secure-key')).toBeNull()
      expect(localStorage.getItem('regular-key')).toBe('regular-value')
    })

    it('should clear encryption key from sessionStorage', async () => {
      await setSecureItem('key', 'value')
      expect(sessionStorage.getItem('_secure_session_key')).not.toBeNull()

      clearSecureStorage()

      expect(sessionStorage.getItem('_secure_session_key')).toBeNull()
    })
  })

  describe('hasSecureItem()', () => {
    it('should return true for existing item', async () => {
      await setSecureItem('exists', 'value')

      const result = hasSecureItem('exists')
      expect(result).toBe(true)
    })

    it('should return false for non-existent item', () => {
      const result = hasSecureItem('not-exists')
      expect(result).toBe(false)
    })

    it('should return false for expired item', async () => {
      vi.useFakeTimers()

      await setSecureItem('expiring', 'value', { ttl: 1000 })
      vi.advanceTimersByTime(2000)

      const result = hasSecureItem('expiring')
      expect(result).toBe(false)

      vi.useRealTimers()
    })
  })

  describe('getSecureItemMetadata()', () => {
    it('deve retornar o tempo de expiração do item existente', async () => {
      vi.useFakeTimers()
      const now = Date.now()
      vi.setSystemTime(now)

      await setSecureItem('meta-key', 'value')

      const expiration = getSecureItemMetadata('meta-key')

      expect(expiration).not.toBeNull()
      expect(expiration).toBeGreaterThanOrEqual(now)

      vi.useRealTimers()
    })

    it('deve retornar o tempo de expiração correto quando TTL é definido', async () => {
      vi.useFakeTimers()
      const now = Date.now()
      vi.setSystemTime(now)

      await setSecureItem('expiring-meta', 'value', { ttl: 60000 })

      const expiration = getSecureItemMetadata('expiring-meta')

      expect(expiration).not.toBeNull()
      expect(expiration).toBe(now + 60000)

      vi.useRealTimers()
    })

    it('deve retornar null para chave inexistente', () => {
      const expiration = getSecureItemMetadata('non-existent')
      expect(expiration).toBeNull()
    })

    it('deve retornar null para dados corrompidos', () => {
      localStorage.setItem('_secure_corrupted-meta', 'not-json')

      const expiration = getSecureItemMetadata('corrupted-meta')
      expect(expiration).toBeNull()
    })
  })

  describe('isSecureStorageAvailable()', () => {
    it('should return true when crypto and storage are available', () => {
      expect(isSecureStorageAvailable()).toBe(true)
    })

    it('should check for crypto.subtle availability', () => {
      expect(typeof crypto.subtle).toBe('object')
    })
  })

  describe('chave de criptografia ausente', () => {
    it('deve retornar null quando a chave de sessão é perdida', async () => {
      await setSecureItem('key', 'value')

      // Simula sessão nova (aba fechada + reaberta)
      clearSessionKey()

      const result = await getSecureItem('key')
      expect(result).toBeNull()
    })
  })

  describe('overwriting values', () => {
    it('should overwrite existing value', async () => {
      await setSecureItem('overwrite', 'first')
      expect(await getSecureItem<string>('overwrite')).toBe('first')

      await setSecureItem('overwrite', 'second')
      expect(await getSecureItem<string>('overwrite')).toBe('second')
    })

    it('should update expiration on overwrite', async () => {
      vi.useFakeTimers()

      await setSecureItem('expiry-update', 'value', { ttl: 60000 })
      vi.advanceTimersByTime(50000)

      await setSecureItem('expiry-update', 'new-value', { ttl: 60000 })
      vi.advanceTimersByTime(50000)

      const result = await getSecureItem<string>('expiry-update')
      expect(result).toBe('new-value')

      vi.useRealTimers()
    })
  })

  describe('sequential operations', () => {
    it('should handle multiple sequential sets', async () => {
      await setSecureItem('seq1', 'value1')
      await setSecureItem('seq2', 'value2')
      await setSecureItem('seq3', 'value3')

      expect(await getSecureItem<string>('seq1')).toBe('value1')
      expect(await getSecureItem<string>('seq2')).toBe('value2')
      expect(await getSecureItem<string>('seq3')).toBe('value3')
    })

    it('should handle multiple gets after sets', async () => {
      await setSecureItem('get1', 'value1')
      await setSecureItem('get2', 'value2')
      await setSecureItem('get3', 'value3')

      const v1 = await getSecureItem<string>('get1')
      const v2 = await getSecureItem<string>('get2')
      const v3 = await getSecureItem<string>('get3')

      expect(v1).toBe('value1')
      expect(v2).toBe('value2')
      expect(v3).toBe('value3')
    })
  })

  describe('localStorage unavailable', () => {
    it('deve lançar erro de setSecureItem quando localStorage está indisponível', async () => {
      const originalLocalStorage = global.localStorage
      // @ts-expect-error - testando localStorage ausente
      delete global.localStorage

      await expect(setSecureItem('key', 'value')).rejects.toThrow()

      global.localStorage = originalLocalStorage
    })

    it('deve lançar erro de getSecureItem quando localStorage está indisponível', async () => {
      const originalLocalStorage = global.localStorage
      // @ts-expect-error - testando localStorage ausente
      delete global.localStorage

      await expect(getSecureItem('key')).rejects.toThrow()

      global.localStorage = originalLocalStorage
    })
  })

  describe('prefixo de chave', () => {
    it('deve prefixar chaves com _secure_', async () => {
      await setSecureItem('my-key', 'value')

      expect(localStorage.getItem('_secure_my-key')).not.toBeNull()
      expect(localStorage.getItem('my-key')).toBeNull()
    })
  })
})
