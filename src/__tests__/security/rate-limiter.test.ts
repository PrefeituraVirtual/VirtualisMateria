/**
 * Rate Limiter Tests
 *
 * Comprehensive tests for the RateLimiter class including:
 * - Token consumption and blocking
 * - Token refill over time
 * - Edge cases and multiple instances
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  RateLimiter,
  createApiRateLimiter,
  createFormRateLimiter,
  createChatRateLimiter,
} from '@/lib/security/rate-limiter'

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('constructor', () => {
    it('should initialize with correct max tokens and refill rate', () => {
      const limiter = new RateLimiter(10, 2)

      expect(limiter.getRemainingTokens()).toBe(10)
    })

    it('should handle zero max tokens', () => {
      const limiter = new RateLimiter(0, 1)

      expect(limiter.getRemainingTokens()).toBe(0)
      expect(limiter.tryConsume()).toBe(false)
    })

    it('should handle negative max tokens by treating as zero', () => {
      const limiter = new RateLimiter(-5, 1)

      expect(limiter.getRemainingTokens()).toBe(0)
      expect(limiter.tryConsume()).toBe(false)
    })

    it('should handle zero refill rate', () => {
      const limiter = new RateLimiter(5, 0)

      // Consume all tokens
      for (let i = 0; i < 5; i++) {
        expect(limiter.tryConsume()).toBe(true)
      }

      // Should be blocked
      expect(limiter.tryConsume()).toBe(false)

      // Advance time - should still be blocked (no refill)
      vi.advanceTimersByTime(10000)
      expect(limiter.tryConsume()).toBe(false)
    })

    it('should handle negative refill rate by treating as zero', () => {
      const limiter = new RateLimiter(3, -1)

      // Consume all tokens
      expect(limiter.tryConsume()).toBe(true)
      expect(limiter.tryConsume()).toBe(true)
      expect(limiter.tryConsume()).toBe(true)
      expect(limiter.tryConsume()).toBe(false)

      // Advance time - no refill should happen
      vi.advanceTimersByTime(5000)
      expect(limiter.tryConsume()).toBe(false)
    })
  })

  describe('tryConsume()', () => {
    it('should return true when tokens are available', () => {
      const limiter = new RateLimiter(5, 1)

      expect(limiter.tryConsume()).toBe(true)
      expect(limiter.getRemainingTokens()).toBe(4)
    })

    it('should return false when no tokens are available', () => {
      const limiter = new RateLimiter(2, 0)

      expect(limiter.tryConsume()).toBe(true)
      expect(limiter.tryConsume()).toBe(true)
      expect(limiter.tryConsume()).toBe(false)
    })

    it('should block after limit is reached', () => {
      const limiter = new RateLimiter(3, 0)

      // Consume all tokens
      expect(limiter.tryConsume()).toBe(true)
      expect(limiter.tryConsume()).toBe(true)
      expect(limiter.tryConsume()).toBe(true)

      // Should be blocked
      expect(limiter.tryConsume()).toBe(false)
      expect(limiter.tryConsume()).toBe(false)
    })

    it('should consume exactly one token per call', () => {
      const limiter = new RateLimiter(10, 0)

      expect(limiter.getRemainingTokens()).toBe(10)
      limiter.tryConsume()
      expect(limiter.getRemainingTokens()).toBe(9)
      limiter.tryConsume()
      expect(limiter.getRemainingTokens()).toBe(8)
    })
  })

  describe('token refill over time', () => {
    it('should refill tokens based on elapsed time', () => {
      const limiter = new RateLimiter(10, 2) // 2 tokens per second

      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        limiter.tryConsume()
      }
      expect(limiter.getRemainingTokens()).toBe(0)

      // Advance time by 1 second
      vi.advanceTimersByTime(1000)

      // Should have 2 tokens (2 tokens/sec * 1 sec)
      expect(limiter.getRemainingTokens()).toBe(2)
    })

    it('should not exceed max tokens during refill', () => {
      const limiter = new RateLimiter(5, 10) // 10 tokens per second, max 5

      // Advance time significantly
      vi.advanceTimersByTime(10000)

      // Should still be capped at max
      expect(limiter.getRemainingTokens()).toBe(5)
    })

    it('should refill fractionally over time', () => {
      const limiter = new RateLimiter(10, 1) // 1 token per second

      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        limiter.tryConsume()
      }

      // Advance by 500ms - should have 0.5 tokens (floor = 0)
      vi.advanceTimersByTime(500)
      expect(limiter.getRemainingTokens()).toBe(0)
      expect(limiter.tryConsume()).toBe(false)

      // Advance by another 500ms - should have 1 token
      vi.advanceTimersByTime(500)
      expect(limiter.getRemainingTokens()).toBe(1)
      expect(limiter.tryConsume()).toBe(true)
    })

    it('should allow consumption after refill', () => {
      const limiter = new RateLimiter(2, 1)

      // Consume all
      expect(limiter.tryConsume()).toBe(true)
      expect(limiter.tryConsume()).toBe(true)
      expect(limiter.tryConsume()).toBe(false)

      // Wait for refill
      vi.advanceTimersByTime(1000)

      // Should be able to consume again
      expect(limiter.tryConsume()).toBe(true)
    })
  })

  describe('getRemainingTokens()', () => {
    it('should return accurate token count', () => {
      const limiter = new RateLimiter(5, 0)

      expect(limiter.getRemainingTokens()).toBe(5)
      limiter.tryConsume()
      expect(limiter.getRemainingTokens()).toBe(4)
      limiter.tryConsume()
      limiter.tryConsume()
      expect(limiter.getRemainingTokens()).toBe(2)
    })

    it('should account for refill when getting remaining tokens', () => {
      const limiter = new RateLimiter(10, 2)

      // Consume all
      for (let i = 0; i < 10; i++) {
        limiter.tryConsume()
      }

      expect(limiter.getRemainingTokens()).toBe(0)

      // Advance time
      vi.advanceTimersByTime(2500) // 2.5 seconds = 5 tokens

      expect(limiter.getRemainingTokens()).toBe(5)
    })

    it('should return integer values (floor)', () => {
      const limiter = new RateLimiter(10, 1)

      for (let i = 0; i < 10; i++) {
        limiter.tryConsume()
      }

      vi.advanceTimersByTime(1500) // 1.5 tokens
      expect(limiter.getRemainingTokens()).toBe(1)
    })
  })

  describe('getTimeUntilNextToken()', () => {
    it('should return 0 when tokens are available', () => {
      const limiter = new RateLimiter(5, 1)

      expect(limiter.getTimeUntilNextToken()).toBe(0)
    })

    it('should calculate correct wait time when empty', () => {
      const limiter = new RateLimiter(3, 2) // 2 tokens per second

      // Consume all
      for (let i = 0; i < 3; i++) {
        limiter.tryConsume()
      }

      // Need 1 token at 2 tokens/sec = 0.5 seconds = 500ms
      expect(limiter.getTimeUntilNextToken()).toBe(500)
    })

    it('should return correct time accounting for partial refill', () => {
      const limiter = new RateLimiter(5, 1) // 1 token per second

      // Consume all
      for (let i = 0; i < 5; i++) {
        limiter.tryConsume()
      }

      // Advance 300ms
      vi.advanceTimersByTime(300)

      // Should need 700ms more to get to 1 token
      const timeUntil = limiter.getTimeUntilNextToken()
      expect(timeUntil).toBe(700)
    })

    it('should return Infinity when refill rate is zero', () => {
      const limiter = new RateLimiter(2, 0)

      limiter.tryConsume()
      limiter.tryConsume()

      expect(limiter.getTimeUntilNextToken()).toBe(Infinity)
    })
  })

  describe('reset()', () => {
    it('should reset to full capacity', () => {
      const limiter = new RateLimiter(10, 1)

      // Consume some tokens
      for (let i = 0; i < 7; i++) {
        limiter.tryConsume()
      }
      expect(limiter.getRemainingTokens()).toBe(3)

      // Reset
      limiter.reset()
      expect(limiter.getRemainingTokens()).toBe(10)
    })

    it('should work after being fully depleted', () => {
      const limiter = new RateLimiter(3, 0)

      // Deplete
      for (let i = 0; i < 3; i++) {
        limiter.tryConsume()
      }
      expect(limiter.tryConsume()).toBe(false)

      // Reset
      limiter.reset()
      expect(limiter.tryConsume()).toBe(true)
      expect(limiter.getRemainingTokens()).toBe(2)
    })
  })

  describe('canProceed()', () => {
    it('should return true when tokens available', () => {
      const limiter = new RateLimiter(5, 1)

      expect(limiter.canProceed()).toBe(true)
    })

    it('should return false when no tokens available', () => {
      const limiter = new RateLimiter(2, 0)

      limiter.tryConsume()
      limiter.tryConsume()

      expect(limiter.canProceed()).toBe(false)
    })

    it('should not consume token when checking', () => {
      const limiter = new RateLimiter(2, 0)

      expect(limiter.canProceed()).toBe(true)
      expect(limiter.getRemainingTokens()).toBe(2)
      expect(limiter.canProceed()).toBe(true)
      expect(limiter.getRemainingTokens()).toBe(2)
    })
  })

  describe('multiple independent instances', () => {
    it('should not interfere with each other', () => {
      const limiter1 = new RateLimiter(5, 1)
      const limiter2 = new RateLimiter(10, 2)

      // Consume from limiter1
      for (let i = 0; i < 5; i++) {
        limiter1.tryConsume()
      }

      expect(limiter1.getRemainingTokens()).toBe(0)
      expect(limiter2.getRemainingTokens()).toBe(10)
    })

    it('should have independent refill timers', () => {
      const limiter1 = new RateLimiter(5, 1)
      const limiter2 = new RateLimiter(5, 2)

      // Consume all from both
      for (let i = 0; i < 5; i++) {
        limiter1.tryConsume()
        limiter2.tryConsume()
      }

      vi.advanceTimersByTime(1000)

      expect(limiter1.getRemainingTokens()).toBe(1)
      expect(limiter2.getRemainingTokens()).toBe(2)
    })

    it('should have independent reset', () => {
      const limiter1 = new RateLimiter(3, 0)
      const limiter2 = new RateLimiter(3, 0)

      limiter1.tryConsume()
      limiter2.tryConsume()

      limiter1.reset()

      expect(limiter1.getRemainingTokens()).toBe(3)
      expect(limiter2.getRemainingTokens()).toBe(2)
    })
  })

  describe('edge cases', () => {
    it('should handle rapid consecutive calls', () => {
      const limiter = new RateLimiter(100, 10)

      let consumed = 0
      for (let i = 0; i < 150; i++) {
        if (limiter.tryConsume()) {
          consumed++
        }
      }

      expect(consumed).toBe(100)
    })

    it('should handle very small refill rates', () => {
      const limiter = new RateLimiter(5, 0.1) // 1 token per 10 seconds

      for (let i = 0; i < 5; i++) {
        limiter.tryConsume()
      }

      vi.advanceTimersByTime(5000) // 5 seconds
      expect(limiter.getRemainingTokens()).toBe(0)

      vi.advanceTimersByTime(5000) // 10 seconds total
      expect(limiter.getRemainingTokens()).toBe(1)
    })

    it('should handle very large refill rates', () => {
      const limiter = new RateLimiter(1000, 10000) // 10000 tokens per second

      for (let i = 0; i < 1000; i++) {
        limiter.tryConsume()
      }

      vi.advanceTimersByTime(10) // 10ms = 100 tokens
      expect(limiter.getRemainingTokens()).toBe(100)
    })

    it('should handle consuming exactly at capacity', () => {
      const limiter = new RateLimiter(5, 1)

      for (let i = 0; i < 5; i++) {
        expect(limiter.tryConsume()).toBe(true)
      }
      expect(limiter.tryConsume()).toBe(false)
    })
  })
})

describe('Rate Limiter Factory Functions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('createApiRateLimiter()', () => {
    it('should create limiter with 10 burst capacity', () => {
      const limiter = createApiRateLimiter()

      expect(limiter.getRemainingTokens()).toBe(10)
    })

    it('should refill at 1 token per second', () => {
      const limiter = createApiRateLimiter()

      // Consume all
      for (let i = 0; i < 10; i++) {
        limiter.tryConsume()
      }

      vi.advanceTimersByTime(3000) // 3 seconds
      expect(limiter.getRemainingTokens()).toBe(3)
    })
  })

  describe('createFormRateLimiter()', () => {
    it('should create limiter with 5 burst capacity', () => {
      const limiter = createFormRateLimiter()

      expect(limiter.getRemainingTokens()).toBe(5)
    })

    it('should have slow refill rate (about 5 per minute)', () => {
      const limiter = createFormRateLimiter()

      // Consume all
      for (let i = 0; i < 5; i++) {
        limiter.tryConsume()
      }

      // After 12 seconds, should have ~1 token (0.083 * 12 = ~1)
      vi.advanceTimersByTime(12000)
      expect(limiter.getRemainingTokens()).toBe(0)

      vi.advanceTimersByTime(1000) // 13 seconds total
      expect(limiter.getRemainingTokens()).toBe(1)
    })
  })

  describe('createChatRateLimiter()', () => {
    it('should create limiter with 20 burst capacity', () => {
      const limiter = createChatRateLimiter()

      expect(limiter.getRemainingTokens()).toBe(20)
    })

    it('should refill at 1 token per second', () => {
      const limiter = createChatRateLimiter()

      // Consume all
      for (let i = 0; i < 20; i++) {
        limiter.tryConsume()
      }

      vi.advanceTimersByTime(5000)
      expect(limiter.getRemainingTokens()).toBe(5)
    })
  })
})
