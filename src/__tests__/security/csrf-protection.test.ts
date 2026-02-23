/**
 * CSRF Protection Tests
 *
 * Comprehensive tests for CSRF token generation, storage, and validation.
 * Tests cover token uniqueness, persistence, and security measures.
 */

// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  generateCSRFToken,
  storeCSRFToken,
  getCSRFToken,
  clearCSRFToken,
  validateCSRFToken,
  initializeCSRFToken,
  ensureCSRFToken,
  getCSRFHeaders,
  getCSRFInputProps,
  createCSRFTokenState,
} from '@/lib/security/csrf-protection'

describe('CSRF Protection', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateCSRFToken()', () => {
    it('should produce unique tokens on each call', () => {
      const token1 = generateCSRFToken()
      const token2 = generateCSRFToken()
      const token3 = generateCSRFToken()

      expect(token1).not.toBe(token2)
      expect(token2).not.toBe(token3)
      expect(token1).not.toBe(token3)
    })

    it('should generate token with default length', () => {
      const token = generateCSRFToken()

      // Default is 32 bytes = 64 hex characters
      expect(token.length).toBe(64)
    })

    it('should generate token with specified length', () => {
      const token = generateCSRFToken(16)

      // 16 bytes = 32 hex characters
      expect(token.length).toBe(32)
    })

    it('should only contain hexadecimal characters', () => {
      const token = generateCSRFToken()

      expect(token).toMatch(/^[0-9a-f]+$/)
    })

    it('should be cryptographically random (statistical test)', () => {
      // Generate multiple tokens and check for basic randomness
      const tokens = new Set<string>()

      for (let i = 0; i < 100; i++) {
        tokens.add(generateCSRFToken())
      }

      // All tokens should be unique
      expect(tokens.size).toBe(100)
    })

    it('should handle length of 0', () => {
      const token = generateCSRFToken(0)

      expect(token).toBe('')
    })

    it('should handle large lengths', () => {
      const token = generateCSRFToken(128)

      expect(token.length).toBe(256) // 128 bytes = 256 hex chars
    })
  })

  describe('storeCSRFToken() and getCSRFToken()', () => {
    it('should store and retrieve token successfully', () => {
      const token = 'test-token-12345'

      storeCSRFToken(token)
      const retrieved = getCSRFToken()

      expect(retrieved).toBe(token)
    })

    it('should overwrite existing token', () => {
      storeCSRFToken('first-token')
      storeCSRFToken('second-token')

      expect(getCSRFToken()).toBe('second-token')
    })

    it('should return null when no token is stored', () => {
      expect(getCSRFToken()).toBeNull()
    })

    it('should persist in sessionStorage', () => {
      const token = 'persistent-token'
      storeCSRFToken(token)

      // Check directly in sessionStorage
      expect(sessionStorage.getItem('csrf_token')).toBe(token)
    })
  })

  describe('clearCSRFToken()', () => {
    it('should remove stored token', () => {
      storeCSRFToken('token-to-clear')
      expect(getCSRFToken()).toBe('token-to-clear')

      clearCSRFToken()
      expect(getCSRFToken()).toBeNull()
    })

    it('should not throw when no token exists', () => {
      expect(() => clearCSRFToken()).not.toThrow()
    })
  })

  describe('validateCSRFToken()', () => {
    it('should return true for valid tokens', () => {
      const token = 'valid-token-abc123'
      storeCSRFToken(token)

      expect(validateCSRFToken(token)).toBe(true)
    })

    it('should return false for invalid tokens', () => {
      storeCSRFToken('correct-token')

      expect(validateCSRFToken('wrong-token')).toBe(false)
    })

    it('should return false when no token is stored', () => {
      expect(validateCSRFToken('any-token')).toBe(false)
    })

    it('should return false for null token', () => {
      storeCSRFToken('stored-token')

      expect(validateCSRFToken(null)).toBe(false)
    })

    it('should return false for undefined token', () => {
      storeCSRFToken('stored-token')

      expect(validateCSRFToken(undefined)).toBe(false)
    })

    it('should return false for empty string token', () => {
      storeCSRFToken('stored-token')

      expect(validateCSRFToken('')).toBe(false)
    })

    it('should return false for non-string token', () => {
      storeCSRFToken('stored-token')

      // @ts-expect-error - testing number handling
      expect(validateCSRFToken(12345)).toBe(false)
    })

    it('should be case-sensitive', () => {
      storeCSRFToken('Token-ABC')

      expect(validateCSRFToken('Token-ABC')).toBe(true)
      expect(validateCSRFToken('token-abc')).toBe(false)
      expect(validateCSRFToken('TOKEN-ABC')).toBe(false)
    })

    it('should handle whitespace correctly', () => {
      storeCSRFToken('token-with-no-space')

      expect(validateCSRFToken('token-with-no-space')).toBe(true)
      expect(validateCSRFToken(' token-with-no-space')).toBe(false)
      expect(validateCSRFToken('token-with-no-space ')).toBe(false)
    })
  })

  describe('initializeCSRFToken()', () => {
    it('should generate and store a new token', () => {
      const token = initializeCSRFToken()

      expect(token).toBeTruthy()
      expect(token.length).toBe(64)
      expect(getCSRFToken()).toBe(token)
    })

    it('should overwrite existing token', () => {
      storeCSRFToken('old-token')
      const newToken = initializeCSRFToken()

      expect(getCSRFToken()).toBe(newToken)
      expect(newToken).not.toBe('old-token')
    })
  })

  describe('ensureCSRFToken()', () => {
    it('should return existing token if present', () => {
      const existingToken = 'existing-token'
      storeCSRFToken(existingToken)

      const result = ensureCSRFToken()

      expect(result).toBe(existingToken)
    })

    it('should generate new token if none exists', () => {
      const result = ensureCSRFToken()

      expect(result).toBeTruthy()
      expect(result.length).toBe(64)
      expect(getCSRFToken()).toBe(result)
    })

    it('should not regenerate token on subsequent calls', () => {
      const first = ensureCSRFToken()
      const second = ensureCSRFToken()
      const third = ensureCSRFToken()

      expect(first).toBe(second)
      expect(second).toBe(third)
    })
  })

  describe('getCSRFHeaders()', () => {
    it('should return object with X-CSRF-Token header', () => {
      const headers = getCSRFHeaders()

      expect(headers).toHaveProperty('X-CSRF-Token')
      expect(typeof headers['X-CSRF-Token']).toBe('string')
    })

    it('should use existing token if available', () => {
      storeCSRFToken('my-header-token')

      const headers = getCSRFHeaders()

      expect(headers['X-CSRF-Token']).toBe('my-header-token')
    })

    it('should generate token if none exists', () => {
      const headers = getCSRFHeaders()

      expect(headers['X-CSRF-Token'].length).toBe(64)
    })
  })

  describe('getCSRFInputProps()', () => {
    it('should return input properties', () => {
      const props = getCSRFInputProps()

      expect(props.name).toBe('_csrf')
      expect(props.type).toBe('hidden')
      expect(typeof props.value).toBe('string')
    })

    it('should use existing token for value', () => {
      storeCSRFToken('input-token')

      const props = getCSRFInputProps()

      expect(props.value).toBe('input-token')
    })

    it('should generate token if none exists', () => {
      const props = getCSRFInputProps()

      expect(props.value.length).toBe(64)
    })
  })

  describe('createCSRFTokenState()', () => {
    it('should return token and functions', () => {
      const state = createCSRFTokenState()

      expect(state).toHaveProperty('token')
      expect(state).toHaveProperty('refresh')
      expect(state).toHaveProperty('validate')
      expect(typeof state.token).toBe('string')
      expect(typeof state.refresh).toBe('function')
      expect(typeof state.validate).toBe('function')
    })

    it('should use existing token', () => {
      storeCSRFToken('state-token')

      const state = createCSRFTokenState()

      expect(state.token).toBe('state-token')
    })

    it('should generate token if none exists', () => {
      const state = createCSRFTokenState()

      expect(state.token.length).toBe(64)
    })

    describe('refresh()', () => {
      it('should generate new token', () => {
        const state = createCSRFTokenState()
        const originalToken = state.token

        const newToken = state.refresh()

        expect(newToken).not.toBe(originalToken)
        expect(newToken.length).toBe(64)
      })

      it('should store the new token', () => {
        const state = createCSRFTokenState()

        const newToken = state.refresh()

        expect(getCSRFToken()).toBe(newToken)
      })
    })

    describe('validate()', () => {
      it('should validate correct token', () => {
        const state = createCSRFTokenState()

        expect(state.validate(state.token)).toBe(true)
      })

      it('should reject incorrect token', () => {
        const state = createCSRFTokenState()

        expect(state.validate('wrong-token')).toBe(false)
      })
    })
  })

  describe('timing attack prevention', () => {
    it('should take similar time for same-length valid and invalid tokens', () => {
      const validToken = generateCSRFToken()
      storeCSRFToken(validToken)

      // Generate invalid token of same length
      const invalidToken = generateCSRFToken()

      // Measure validation time (this is a simple check, not a rigorous timing analysis)
      const start1 = performance.now()
      for (let i = 0; i < 1000; i++) {
        validateCSRFToken(validToken)
      }
      const time1 = performance.now() - start1

      const start2 = performance.now()
      for (let i = 0; i < 1000; i++) {
        validateCSRFToken(invalidToken)
      }
      const time2 = performance.now() - start2

      // Times should be within 50% of each other (loose tolerance for test environment)
      const ratio = time1 / time2
      expect(ratio).toBeGreaterThan(0.5)
      expect(ratio).toBeLessThan(2)
    })
  })

  describe('sessionStorage unavailable', () => {
    it('should handle missing sessionStorage gracefully', () => {
      // Temporarily remove sessionStorage
      const originalSessionStorage = global.sessionStorage
      // @ts-expect-error - testing undefined sessionStorage
      delete global.sessionStorage

      // These should not throw
      expect(() => storeCSRFToken('test')).not.toThrow()
      expect(getCSRFToken()).toBeNull()
      expect(() => clearCSRFToken()).not.toThrow()

      // Restore sessionStorage
      global.sessionStorage = originalSessionStorage
    })
  })

  describe('storage errors', () => {
    it('should handle sessionStorage.setItem errors', () => {
      const spy = vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceeded')
      })
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Should not throw
      expect(() => storeCSRFToken('test')).not.toThrow()

      spy.mockRestore()
      warnSpy.mockRestore()
    })

    it('should handle sessionStorage.getItem errors', () => {
      const spy = vi.spyOn(sessionStorage, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError')
      })

      expect(getCSRFToken()).toBeNull()

      spy.mockRestore()
    })
  })
})

describe('CSRF Token Integration', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('should maintain token across multiple operations', () => {
    // Initialize
    const token = initializeCSRFToken()

    // Validate
    expect(validateCSRFToken(token)).toBe(true)

    // Get headers
    const headers = getCSRFHeaders()
    expect(headers['X-CSRF-Token']).toBe(token)

    // Get input props
    const props = getCSRFInputProps()
    expect(props.value).toBe(token)

    // Create state
    const state = createCSRFTokenState()
    expect(state.token).toBe(token)
  })

  it('should handle token refresh flow', () => {
    // Start with a token
    const initialToken = initializeCSRFToken()

    // Refresh using state
    const state = createCSRFTokenState()
    const newToken = state.refresh()

    // Old token should be invalid
    expect(validateCSRFToken(initialToken)).toBe(false)

    // New token should be valid
    expect(validateCSRFToken(newToken)).toBe(true)
  })
})
