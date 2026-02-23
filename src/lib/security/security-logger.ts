/**
 * Security Event Logger
 *
 * Provides structured logging for security-related events.
 * Useful for monitoring, auditing, and debugging security issues.
 */

/**
 * Security event severity levels.
 */
export type SecurityEventSeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * Security event types.
 */
export type SecurityEventType =
  | 'xss_attempt'
  | 'csrf_validation_failed'
  | 'rate_limit_exceeded'
  | 'authentication_failed'
  | 'authorization_failed'
  | 'suspicious_input'
  | 'invalid_token'
  | 'session_expired'
  | 'storage_error'
  | 'encryption_error'
  | 'validation_error'
  | 'security_header_missing'
  | 'unsafe_redirect'
  | 'file_upload_blocked'
  | 'sql_injection_attempt'
  | 'path_traversal_attempt'

/**
 * Security event structure.
 */
export interface SecurityEvent {
  type: SecurityEventType
  severity: SecurityEventSeverity
  message: string
  timestamp: string
  details?: Record<string, unknown>
  url?: string
  userAgent?: string
  userId?: string
}

/**
 * Configuration for the security logger.
 */
export interface SecurityLoggerConfig {
  enabled: boolean
  logToConsole: boolean
  logToServer: boolean
  serverEndpoint?: string
  minSeverity: SecurityEventSeverity
}

/**
 * Default configuration.
 */
const defaultConfig: SecurityLoggerConfig = {
  enabled: true,
  logToConsole: process.env.NODE_ENV === 'development',
  logToServer: process.env.NODE_ENV === 'production',
  minSeverity: 'low',
}

/**
 * Current configuration.
 */
let currentConfig: SecurityLoggerConfig = { ...defaultConfig }

/**
 * Severity level ordering for filtering.
 */
const severityOrder: Record<SecurityEventSeverity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
}

/**
 * Event queue for batching server logs.
 */
const eventQueue: SecurityEvent[] = []

/**
 * Flush timer for batching.
 */
let flushTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Configures the security logger.
 *
 * @param config - Partial configuration to merge
 */
export function configureSecurityLogger(
  config: Partial<SecurityLoggerConfig>
): void {
  currentConfig = { ...currentConfig, ...config }
}

/**
 * Gets the current configuration.
 */
export function getSecurityLoggerConfig(): SecurityLoggerConfig {
  return { ...currentConfig }
}

/**
 * Resets configuration to defaults.
 */
export function resetSecurityLoggerConfig(): void {
  currentConfig = { ...defaultConfig }
}

/**
 * Creates a security event object.
 *
 * @param type - Event type
 * @param severity - Event severity
 * @param message - Human-readable message
 * @param details - Additional details
 */
function createSecurityEvent(
  type: SecurityEventType,
  severity: SecurityEventSeverity,
  message: string,
  details?: Record<string, unknown>
): SecurityEvent {
  const event: SecurityEvent = {
    type,
    severity,
    message,
    timestamp: new Date().toISOString(),
    details,
  }

  // Add browser context if available
  if (typeof window !== 'undefined') {
    event.url = window.location.href
    event.userAgent = navigator.userAgent
  }

  return event
}

/**
 * Logs an event to the console.
 */
function logToConsole(event: SecurityEvent): void {
  const prefix = `[SECURITY:${event.severity.toUpperCase()}]`

  switch (event.severity) {
    case 'critical':
    case 'high':
      console.error(prefix, event.type, event.message, event.details || '')
      break
    case 'medium':
      console.warn(prefix, event.type, event.message, event.details || '')
      break
    default:
      console.info(prefix, event.type, event.message, event.details || '')
  }
}

/**
 * Queues an event for server logging.
 */
function queueForServer(event: SecurityEvent): void {
  eventQueue.push(event)

  // Schedule flush if not already scheduled
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushEventQueue()
    }, 5000) // Flush every 5 seconds
  }

  // Immediately flush if queue is large
  if (eventQueue.length >= 10) {
    flushEventQueue()
  }
}

/**
 * Flushes the event queue to the server.
 */
async function flushEventQueue(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }

  if (eventQueue.length === 0 || !currentConfig.serverEndpoint) {
    return
  }

  const events = [...eventQueue]
  eventQueue.length = 0

  try {
    await fetch(currentConfig.serverEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
    })
  } catch {
    // Re-queue failed events (with limit to prevent infinite growth)
    if (eventQueue.length < 100) {
      eventQueue.push(...events)
    }
  }
}

/**
 * Checks if an event should be logged based on severity.
 */
function shouldLog(severity: SecurityEventSeverity): boolean {
  if (!currentConfig.enabled) {
    return false
  }

  return severityOrder[severity] >= severityOrder[currentConfig.minSeverity]
}

/**
 * Logs a security event.
 *
 * @param type - Event type
 * @param severity - Event severity
 * @param message - Human-readable message
 * @param details - Additional details
 *
 * @example
 * ```typescript
 * logSecurityEvent(
 *   'xss_attempt',
 *   'high',
 *   'Detected XSS payload in user input',
 *   { input: '<script>alert(1)</script>', field: 'comment' }
 * )
 * ```
 */
export function logSecurityEvent(
  type: SecurityEventType,
  severity: SecurityEventSeverity,
  message: string,
  details?: Record<string, unknown>
): void {
  if (!shouldLog(severity)) {
    return
  }

  const event = createSecurityEvent(type, severity, message, details)

  if (currentConfig.logToConsole) {
    logToConsole(event)
  }

  if (currentConfig.logToServer && currentConfig.serverEndpoint) {
    queueForServer(event)
  }
}

/**
 * Convenience methods for common security events.
 */
export const securityLogger = {
  /**
   * Logs an XSS attempt.
   */
  xssAttempt(input: string, context?: string): void {
    logSecurityEvent('xss_attempt', 'high', 'XSS attempt detected', {
      input: input.substring(0, 200), // Truncate for safety
      context,
    })
  },

  /**
   * Logs a CSRF validation failure.
   */
  csrfFailed(endpoint?: string): void {
    logSecurityEvent(
      'csrf_validation_failed',
      'high',
      'CSRF token validation failed',
      { endpoint }
    )
  },

  /**
   * Logs a rate limit exceeded event.
   */
  rateLimitExceeded(action: string, limit: number): void {
    logSecurityEvent(
      'rate_limit_exceeded',
      'medium',
      `Rate limit exceeded for ${action}`,
      { action, limit }
    )
  },

  /**
   * Logs an authentication failure.
   */
  authFailed(reason: string, userId?: string): void {
    logSecurityEvent(
      'authentication_failed',
      'medium',
      `Authentication failed: ${reason}`,
      { reason, userId }
    )
  },

  /**
   * Logs an authorization failure.
   */
  authzFailed(resource: string, action: string, userId?: string): void {
    logSecurityEvent(
      'authorization_failed',
      'medium',
      `Authorization denied for ${action} on ${resource}`,
      { resource, action, userId }
    )
  },

  /**
   * Logs suspicious input detection.
   */
  suspiciousInput(input: string, field: string): void {
    logSecurityEvent(
      'suspicious_input',
      'medium',
      'Suspicious input detected',
      {
        input: input.substring(0, 200),
        field,
      }
    )
  },

  /**
   * Logs an invalid token event.
   */
  invalidToken(tokenType: string, reason?: string): void {
    logSecurityEvent('invalid_token', 'medium', `Invalid ${tokenType} token`, {
      tokenType,
      reason,
    })
  },

  /**
   * Logs a session expiration.
   */
  sessionExpired(userId?: string): void {
    logSecurityEvent('session_expired', 'low', 'Session expired', { userId })
  },

  /**
   * Logs a validation error.
   */
  validationError(field: string, message: string): void {
    logSecurityEvent(
      'validation_error',
      'low',
      `Validation failed for ${field}`,
      { field, message }
    )
  },

  /**
   * Logs a file upload block.
   */
  fileUploadBlocked(filename: string, reason: string): void {
    logSecurityEvent(
      'file_upload_blocked',
      'medium',
      `File upload blocked: ${reason}`,
      { filename, reason }
    )
  },

  /**
   * Logs a SQL injection attempt.
   */
  sqlInjectionAttempt(input: string, context?: string): void {
    logSecurityEvent(
      'sql_injection_attempt',
      'critical',
      'SQL injection attempt detected',
      {
        input: input.substring(0, 200),
        context,
      }
    )
  },

  /**
   * Logs a path traversal attempt.
   */
  pathTraversalAttempt(path: string): void {
    logSecurityEvent(
      'path_traversal_attempt',
      'high',
      'Path traversal attempt detected',
      { path }
    )
  },
}

/**
 * Gets all queued events (for testing).
 */
export function getQueuedEvents(): SecurityEvent[] {
  return [...eventQueue]
}

/**
 * Clears the event queue (for testing).
 */
export function clearEventQueue(): void {
  eventQueue.length = 0
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
}
