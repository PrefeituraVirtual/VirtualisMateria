/**
 * Rate Limiter - Token Bucket Implementation
 *
 * Provides client-side rate limiting to prevent API abuse and provide
 * better UX by failing fast when rate limits would be exceeded.
 *
 * Security considerations:
 * - Client-side rate limiting is a UX feature, not a security control
 * - Server-side rate limiting must still be enforced
 * - This helps reduce unnecessary server load from known rate-limited requests
 */

/**
 * Token Bucket Rate Limiter
 *
 * Implements the token bucket algorithm for smooth rate limiting.
 * Tokens are refilled at a constant rate, allowing for burst capacity
 * while maintaining average rate limits.
 */
export class RateLimiter {
  /** Maximum number of tokens in the bucket */
  private maxTokens: number

  /** Rate at which tokens are refilled (tokens per second) */
  private refillRate: number

  /** Current number of tokens in the bucket */
  private tokens: number

  /** Timestamp of last token refill */
  private lastRefill: number

  /** Name identifier for this rate limiter instance */
  public readonly name: string

  /**
   * Creates a new RateLimiter instance
   *
   * @param name - Identifier for this rate limiter (for logging)
   * @param maxTokens - Maximum tokens (burst capacity)
   * @param tokensPerMinute - Token refill rate per minute
   */
  constructor(name: string, maxTokens: number, tokensPerMinute: number) {
    this.name = name
    this.maxTokens = maxTokens
    this.refillRate = tokensPerMinute / 60 // Convert to tokens per second
    this.tokens = maxTokens // Start with full bucket
    this.lastRefill = Date.now()
  }

  /**
   * Refills tokens based on time elapsed since last refill
   * Called automatically before token consumption
   */
  private refill(): void {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000 // Convert to seconds
    const tokensToAdd = elapsed * this.refillRate

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd)
    this.lastRefill = now
  }

  /**
   * Attempts to consume a token from the bucket
   *
   * @param tokensToConsume - Number of tokens to consume (default: 1)
   * @returns true if token was consumed, false if rate limited
   */
  tryConsume(tokensToConsume: number = 1): boolean {
    this.refill()

    if (this.tokens >= tokensToConsume) {
      this.tokens -= tokensToConsume
      return true
    }

    return false
  }

  /**
   * Gets the current number of available tokens
   *
   * @returns Number of tokens currently available
   */
  getRemainingTokens(): number {
    this.refill()
    return Math.floor(this.tokens)
  }

  /**
   * Calculates time until next token is available
   *
   * @returns Time in milliseconds until at least 1 token is available
   */
  getTimeUntilNextToken(): number {
    this.refill()

    if (this.tokens >= 1) {
      return 0
    }

    const tokensNeeded = 1 - this.tokens
    const secondsToWait = tokensNeeded / this.refillRate
    return Math.ceil(secondsToWait * 1000) // Convert to milliseconds
  }

  /**
   * Checks if a request can be made without consuming a token
   *
   * @param tokensRequired - Number of tokens required (default: 1)
   * @returns true if enough tokens are available
   */
  canConsume(tokensRequired: number = 1): boolean {
    this.refill()
    return this.tokens >= tokensRequired
  }

  /**
   * Resets the rate limiter to full capacity
   * Use with caution - typically only for testing or admin override
   */
  reset(): void {
    this.tokens = this.maxTokens
    this.lastRefill = Date.now()
  }

  /**
   * Gets the current state of the rate limiter
   * Useful for debugging and monitoring
   */
  getState(): {
    name: string
    tokens: number
    maxTokens: number
    refillRate: number
    timeUntilNextToken: number
  } {
    return {
      name: this.name,
      tokens: this.getRemainingTokens(),
      maxTokens: this.maxTokens,
      refillRate: this.refillRate * 60, // Convert back to per minute
      timeUntilNextToken: this.getTimeUntilNextToken(),
    }
  }
}

/**
 * Rate Limit Error
 * Thrown when a rate limit is exceeded
 */
export class RateLimitError extends Error {
  /** Time in milliseconds until the operation can be retried */
  public readonly retryAfterMs: number

  /** Name of the rate limiter that was exceeded */
  public readonly limiterName: string

  constructor(limiterName: string, retryAfterMs: number) {
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000)
    super(`Limite de requisicoes excedido. Aguarde ${retryAfterSeconds} segundos.`)
    this.name = 'RateLimitError'
    this.limiterName = limiterName
    this.retryAfterMs = retryAfterMs
  }
}

// ============================================================================
// Pre-configured Rate Limiter Instances
// ============================================================================

/**
 * General API rate limiter
 * 60 requests per minute with burst capacity of 60
 */
export const apiRateLimiter = new RateLimiter('api', 60, 60)

/**
 * Chat/AI message rate limiter
 * 10 messages per minute with burst capacity of 10
 * More restrictive due to AI processing costs
 */
export const chatRateLimiter = new RateLimiter('chat', 10, 10)

/**
 * File upload rate limiter
 * 5 uploads per minute with burst capacity of 5
 * Restrictive due to storage and processing costs
 */
export const uploadRateLimiter = new RateLimiter('upload', 5, 5)

/**
 * AI analysis rate limiter
 * 3 analyses per minute with burst capacity of 3
 * Most restrictive due to high AI processing costs
 */
export const analysisRateLimiter = new RateLimiter('analysis', 3, 3)

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks rate limit and throws if exceeded
 *
 * @param limiter - Rate limiter instance to check
 * @throws RateLimitError if rate limit is exceeded
 */
export function checkRateLimit(limiter: RateLimiter): void {
  if (!limiter.tryConsume()) {
    throw new RateLimitError(limiter.name, limiter.getTimeUntilNextToken())
  }
}

/**
 * Wraps an async function with rate limiting
 *
 * @param limiter - Rate limiter to use
 * @param fn - Async function to wrap
 * @returns Wrapped function that respects rate limits
 */
export function withRateLimit<T extends (...args: unknown[]) => Promise<unknown>>(
  limiter: RateLimiter,
  fn: T
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    checkRateLimit(limiter)
    return fn(...args) as ReturnType<T>
  }) as T
}

/**
 * Gets a formatted message for rate limit status
 * Useful for UI feedback
 *
 * @param limiter - Rate limiter to check
 * @returns User-friendly status message
 */
export function getRateLimitStatus(limiter: RateLimiter): string {
  const remaining = limiter.getRemainingTokens()
  const state = limiter.getState()

  if (remaining <= 0) {
    const waitSeconds = Math.ceil(state.timeUntilNextToken / 1000)
    return `Limite atingido. Aguarde ${waitSeconds}s.`
  }

  if (remaining <= 3) {
    return `${remaining} requisicoes restantes.`
  }

  return ''
}
