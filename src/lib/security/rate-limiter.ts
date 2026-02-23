/**
 * Rate Limiter Implementation
 *
 * Token bucket algorithm for rate limiting client-side operations.
 * Useful for protecting against rapid-fire API calls or form submissions.
 */

export class RateLimiter {
  private tokens: number
  private lastRefill: number
  private readonly maxTokens: number
  private readonly refillRate: number // tokens per second

  /**
   * Creates a new RateLimiter instance.
   *
   * @param maxTokens - Maximum number of tokens in the bucket
   * @param refillRate - Number of tokens to add per second
   *
   * @example
   * ```typescript
   * // Allow 10 requests, refilling at 2 per second
   * const limiter = new RateLimiter(10, 2)
   *
   * if (limiter.tryConsume()) {
   *   // Proceed with operation
   * } else {
   *   // Rate limited, wait before retrying
   * }
   * ```
   */
  constructor(maxTokens: number, refillRate: number) {
    if (maxTokens < 0) {
      this.maxTokens = 0
    } else {
      this.maxTokens = maxTokens
    }

    if (refillRate < 0) {
      this.refillRate = 0
    } else {
      this.refillRate = refillRate
    }

    this.tokens = this.maxTokens
    this.lastRefill = Date.now()
  }

  /**
   * Refills tokens based on elapsed time since last refill.
   */
  private refill(): void {
    const now = Date.now()
    const elapsedSeconds = (now - this.lastRefill) / 1000

    if (elapsedSeconds > 0) {
      const tokensToAdd = elapsedSeconds * this.refillRate
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd)
      this.lastRefill = now
    }
  }

  /**
   * Attempts to consume a token.
   *
   * @returns true if a token was consumed, false if rate limited
   */
  tryConsume(): boolean {
    this.refill()

    if (this.tokens >= 1) {
      this.tokens -= 1
      return true
    }

    return false
  }

  /**
   * Gets the current number of remaining tokens.
   *
   * @returns Number of tokens available (can be fractional during refill)
   */
  getRemainingTokens(): number {
    this.refill()
    return Math.floor(this.tokens)
  }

  /**
   * Calculates time until the next token is available.
   *
   * @returns Time in milliseconds until next token, or 0 if tokens available
   */
  getTimeUntilNextToken(): number {
    this.refill()

    if (this.tokens >= 1) {
      return 0
    }

    if (this.refillRate <= 0) {
      return Infinity
    }

    const tokensNeeded = 1 - this.tokens
    const secondsNeeded = tokensNeeded / this.refillRate
    return Math.ceil(secondsNeeded * 1000)
  }

  /**
   * Resets the rate limiter to full capacity.
   */
  reset(): void {
    this.tokens = this.maxTokens
    this.lastRefill = Date.now()
  }

  /**
   * Checks if rate limited without consuming a token.
   *
   * @returns true if at least one token is available
   */
  canProceed(): boolean {
    this.refill()
    return this.tokens >= 1
  }
}

/**
 * Creates a rate limiter for API calls.
 * Default: 60 requests per minute with burst of 10.
 */
export function createApiRateLimiter(): RateLimiter {
  return new RateLimiter(10, 1) // 10 burst, 1 per second refill
}

/**
 * Creates a rate limiter for form submissions.
 * Default: 5 submissions per minute.
 */
export function createFormRateLimiter(): RateLimiter {
  return new RateLimiter(5, 0.083) // 5 burst, ~5 per minute
}

/**
 * Creates a rate limiter for chat messages.
 * Default: 20 messages with refill of 1 per second.
 */
export function createChatRateLimiter(): RateLimiter {
  return new RateLimiter(20, 1)
}
