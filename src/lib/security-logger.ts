/**
 * Security Logger - Security Event Logging Utility
 *
 * Provides centralized logging for security-related events.
 * Environment-aware: detailed logging in development, minimal in production.
 *
 * Security considerations:
 * - Never log sensitive data (passwords, tokens, PII)
 * - Production logs should be sent to a secure logging service
 * - Logs can be used for security monitoring and forensics
 * - Rate limit log submissions to prevent log flooding attacks
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Security event types for categorization
 */
export enum SecurityEventType {
  /** Rate limit was exceeded */
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  /** CSRF token validation failed */
  CSRF_VALIDATION_FAILED = 'CSRF_VALIDATION_FAILED',

  /** Potential XSS attack was blocked */
  XSS_ATTEMPT_BLOCKED = 'XSS_ATTEMPT_BLOCKED',

  /** Invalid or expired token detected */
  INVALID_TOKEN = 'INVALID_TOKEN',

  /** Authentication failure */
  AUTH_FAILURE = 'AUTH_FAILURE',

  /** Authorization failure (access denied) */
  AUTHZ_FAILURE = 'AUTHZ_FAILURE',

  /** Suspicious activity detected */
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',

  /** Input validation failure */
  VALIDATION_FAILURE = 'VALIDATION_FAILURE',

  /** Session security event */
  SESSION_EVENT = 'SESSION_EVENT',

  /** Data integrity issue */
  DATA_INTEGRITY = 'DATA_INTEGRITY',
}

/**
 * Severity levels for security events
 */
export enum SecuritySeverity {
  /** Informational - normal security operations */
  INFO = 'INFO',

  /** Warning - potential security issue */
  WARNING = 'WARNING',

  /** Error - security violation or attack detected */
  ERROR = 'ERROR',

  /** Critical - serious security breach */
  CRITICAL = 'CRITICAL',
}

/**
 * Structure for security event data
 */
export interface SecurityEvent {
  /** Unique event identifier */
  id: string

  /** Timestamp when the event occurred */
  timestamp: string

  /** Type of security event */
  type: SecurityEventType

  /** Severity level */
  severity: SecuritySeverity

  /** Human-readable event description */
  message: string

  /** User ID if available (anonymized for LGPD compliance) */
  userId?: string

  /** Additional event details */
  details?: Record<string, unknown>

  /** Request metadata */
  request?: {
    url?: string
    method?: string
    userAgent?: string
    ip?: string
  }
}

/**
 * Options for logging security events
 */
export interface LogOptions {
  /** User ID to associate with the event */
  userId?: string

  /** Additional details to include */
  details?: Record<string, unknown>

  /** Request information */
  request?: {
    url?: string
    method?: string
  }
}

// ============================================================================
// Configuration
// ============================================================================

const isDevelopment = process.env.NODE_ENV === 'development'
const SECURITY_LOG_ENDPOINT = '/api/security/log'

// In-memory buffer for batched logging
let eventBuffer: SecurityEvent[] = []
const BUFFER_FLUSH_INTERVAL = 5000 // 5 seconds
const MAX_BUFFER_SIZE = 50

// Rate limiting for log submissions
let lastLogSubmission = 0
const MIN_LOG_INTERVAL = 1000 // 1 second minimum between submissions

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a unique event ID
 */
function generateEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Gets the current user agent string
 */
function getUserAgent(): string {
  if (typeof navigator !== 'undefined') {
    return navigator.userAgent
  }
  return 'unknown'
}

/**
 * Sanitizes data for logging (removes sensitive information)
 */
function sanitizeForLogging(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie',
    'session',
    'credit_card',
    'cpf',
    'rg',
    'email',
    'phone',
    'telefone',
  ]

  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()

    // Check if key contains sensitive information
    const isSensitive = sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))

    if (isSensitive) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Determines severity based on event type
 */
function getDefaultSeverity(type: SecurityEventType): SecuritySeverity {
  switch (type) {
    case SecurityEventType.XSS_ATTEMPT_BLOCKED:
    case SecurityEventType.CSRF_VALIDATION_FAILED:
      return SecuritySeverity.ERROR

    case SecurityEventType.RATE_LIMIT_EXCEEDED:
    case SecurityEventType.INVALID_TOKEN:
    case SecurityEventType.AUTH_FAILURE:
    case SecurityEventType.AUTHZ_FAILURE:
      return SecuritySeverity.WARNING

    case SecurityEventType.VALIDATION_FAILURE:
    case SecurityEventType.SESSION_EVENT:
      return SecuritySeverity.INFO

    case SecurityEventType.SUSPICIOUS_ACTIVITY:
    case SecurityEventType.DATA_INTEGRITY:
      return SecuritySeverity.CRITICAL

    default:
      return SecuritySeverity.WARNING
  }
}

// ============================================================================
// Core Logging Function
// ============================================================================

/**
 * Logs a security event
 *
 * In development: Logs to console with full details
 * In production: Buffers events and sends to security logging endpoint
 *
 * @param type - Type of security event
 * @param message - Human-readable event description
 * @param options - Additional options and details
 *
 * @example
 * logSecurityEvent(
 *   SecurityEventType.RATE_LIMIT_EXCEEDED,
 *   'API rate limit exceeded for chat endpoint',
 *   { userId: 'user123', details: { endpoint: '/api/chat' } }
 * )
 */
export function logSecurityEvent(
  type: SecurityEventType,
  message: string,
  options: LogOptions = {}
): void {
  const event: SecurityEvent = {
    id: generateEventId(),
    timestamp: new Date().toISOString(),
    type,
    severity: getDefaultSeverity(type),
    message,
    userId: options.userId,
    details: options.details ? sanitizeForLogging(options.details) : undefined,
    request: options.request
      ? {
          ...options.request,
          userAgent: getUserAgent(),
        }
      : undefined,
  }

  // Development: Log to console
  if (isDevelopment) {
    const consoleMethod =
      event.severity === SecuritySeverity.ERROR || event.severity === SecuritySeverity.CRITICAL
        ? console.error
        : event.severity === SecuritySeverity.WARNING
          ? console.warn
          : console.info

    consoleMethod(`[Security ${event.severity}] ${event.type}:`, {
      message: event.message,
      timestamp: event.timestamp,
      ...event.details,
    })
    return
  }

  // Production: Buffer and send to server
  eventBuffer.push(event)

  if (eventBuffer.length >= MAX_BUFFER_SIZE) {
    flushEventBuffer()
  }
}

/**
 * Flushes the event buffer to the server
 * Called automatically when buffer is full or on interval
 */
async function flushEventBuffer(): Promise<void> {
  if (eventBuffer.length === 0) {
    return
  }

  // Rate limit log submissions
  const now = Date.now()
  if (now - lastLogSubmission < MIN_LOG_INTERVAL) {
    return
  }
  lastLogSubmission = now

  const eventsToSend = [...eventBuffer]
  eventBuffer = []

  try {
    // Only send in production and if we're in a browser
    if (typeof window === 'undefined' || isDevelopment) {
      return
    }

    const response = await fetch(SECURITY_LOG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events: eventsToSend }),
      // Don't retry failed log submissions
      keepalive: true,
    })

    if (!response.ok) {
      // Re-add events to buffer if submission failed
      eventBuffer = [...eventsToSend, ...eventBuffer].slice(0, MAX_BUFFER_SIZE)
    }
  } catch {
    // Silently fail - don't let logging errors break the app
    // Re-add events to buffer
    eventBuffer = [...eventsToSend, ...eventBuffer].slice(0, MAX_BUFFER_SIZE)
  }
}

// Set up periodic buffer flush
if (typeof window !== 'undefined' && !isDevelopment) {
  setInterval(flushEventBuffer, BUFFER_FLUSH_INTERVAL)

  // Flush on page unload
  window.addEventListener('beforeunload', () => {
    flushEventBuffer()
  })
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Logs a rate limit exceeded event
 */
export function logRateLimitExceeded(
  endpoint: string,
  userId?: string,
  retryAfterMs?: number
): void {
  logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, `Rate limit exceeded for ${endpoint}`, {
    userId,
    details: { endpoint, retryAfterMs },
    request: { url: endpoint },
  })
}

/**
 * Logs a CSRF validation failure
 */
export function logCSRFValidationFailed(endpoint: string, userId?: string): void {
  logSecurityEvent(
    SecurityEventType.CSRF_VALIDATION_FAILED,
    `CSRF token validation failed for ${endpoint}`,
    {
      userId,
      details: { endpoint },
      request: { url: endpoint },
    }
  )
}

/**
 * Logs an XSS attempt that was blocked
 */
export function logXSSAttemptBlocked(input: string, context: string, userId?: string): void {
  // Truncate and sanitize the malicious input for logging
  const sanitizedInput = input.substring(0, 100).replace(/[<>]/g, '')

  logSecurityEvent(
    SecurityEventType.XSS_ATTEMPT_BLOCKED,
    `Potential XSS attempt blocked in ${context}`,
    {
      userId,
      details: {
        context,
        inputPreview: sanitizedInput,
        inputLength: input.length,
      },
    }
  )
}

/**
 * Logs an invalid token event
 */
export function logInvalidToken(reason: string, userId?: string): void {
  logSecurityEvent(SecurityEventType.INVALID_TOKEN, `Invalid token: ${reason}`, {
    userId,
    details: { reason },
  })
}

/**
 * Logs an authentication failure
 */
export function logAuthFailure(reason: string, attemptedUserId?: string): void {
  logSecurityEvent(SecurityEventType.AUTH_FAILURE, `Authentication failed: ${reason}`, {
    details: {
      reason,
      attemptedUserId: attemptedUserId ? '[REDACTED]' : undefined,
    },
  })
}

/**
 * Logs an authorization failure
 */
export function logAuthzFailure(resource: string, action: string, userId?: string): void {
  logSecurityEvent(
    SecurityEventType.AUTHZ_FAILURE,
    `Authorization denied: ${action} on ${resource}`,
    {
      userId,
      details: { resource, action },
    }
  )
}

/**
 * Logs suspicious activity
 */
export function logSuspiciousActivity(
  description: string,
  userId?: string,
  details?: Record<string, unknown>
): void {
  logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, description, {
    userId,
    details,
  })
}

// ============================================================================
// Export for Testing
// ============================================================================

export const __testing__ = {
  generateEventId,
  sanitizeForLogging,
  getDefaultSeverity,
  flushEventBuffer,
  getEventBuffer: () => eventBuffer,
  clearEventBuffer: () => {
    eventBuffer = []
  },
}
