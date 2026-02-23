/**
 * Security Logger Tests
 *
 * Comprehensive tests for security event logging functionality.
 * Tests cover logging, configuration, and convenience methods.
 */

// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  logSecurityEvent,
  securityLogger,
  configureSecurityLogger,
  getSecurityLoggerConfig,
  resetSecurityLoggerConfig,
  getQueuedEvents,
  clearEventQueue,
  type SecurityEventType,
} from '@/lib/security/security-logger'

describe('Security Logger', () => {
  beforeEach(() => {
    resetSecurityLoggerConfig()
    clearEventQueue()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('logSecurityEvent()', () => {
    it('should log events to console in development', () => {
      configureSecurityLogger({
        enabled: true,
        logToConsole: true,
        logToServer: false,
      })

      // 'high' severity logs to console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      logSecurityEvent('xss_attempt', 'high', 'XSS detected', { input: '<script>' })

      expect(consoleSpy).toHaveBeenCalled()
      const logCall = consoleSpy.mock.calls[0]
      expect(logCall[0]).toContain('[SECURITY:HIGH]')
      expect(logCall[1]).toBe('xss_attempt')
      expect(logCall[2]).toBe('XSS detected')
    })

    it('should log error-level events with console.error', () => {
      configureSecurityLogger({
        enabled: true,
        logToConsole: true,
        logToServer: false,
      })

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      logSecurityEvent('sql_injection_attempt', 'critical', 'SQL injection detected')

      expect(errorSpy).toHaveBeenCalled()
      expect(errorSpy.mock.calls[0][0]).toContain('[SECURITY:CRITICAL]')
    })

    it('should log info-level events with console.info', () => {
      configureSecurityLogger({
        enabled: true,
        logToConsole: true,
        logToServer: false,
      })

      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

      logSecurityEvent('session_expired', 'low', 'Session expired')

      expect(infoSpy).toHaveBeenCalled()
    })

    it('should log warn-level events with console.warn', () => {
      configureSecurityLogger({
        enabled: true,
        logToConsole: true,
        logToServer: false,
      })

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      logSecurityEvent('rate_limit_exceeded', 'medium', 'Rate limit exceeded')

      expect(warnSpy).toHaveBeenCalled()
    })

    it('should not log when disabled', () => {
      configureSecurityLogger({
        enabled: false,
        logToConsole: true,
        logToServer: false,
      })

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      logSecurityEvent('xss_attempt', 'high', 'Should not log')

      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should respect minimum severity level', () => {
      configureSecurityLogger({
        enabled: true,
        logToConsole: true,
        logToServer: false,
        minSeverity: 'high',
      })

      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Should not log low or medium
      logSecurityEvent('session_expired', 'low', 'Low severity')
      logSecurityEvent('rate_limit_exceeded', 'medium', 'Medium severity')

      expect(consoleSpy).not.toHaveBeenCalled()
      expect(warnSpy).not.toHaveBeenCalled()

      // Should log high and critical
      logSecurityEvent('xss_attempt', 'high', 'High severity')
      expect(errorSpy).toHaveBeenCalled()
    })
  })

  describe('event structure', () => {
    it('should create event with correct structure', () => {
      configureSecurityLogger({
        enabled: true,
        logToConsole: false,
        logToServer: true,
        serverEndpoint: '/api/security-logs',
      })

      logSecurityEvent('xss_attempt', 'high', 'XSS detected', { field: 'comment' })

      const events = getQueuedEvents()
      expect(events.length).toBe(1)

      const event = events[0]
      expect(event.type).toBe('xss_attempt')
      expect(event.severity).toBe('high')
      expect(event.message).toBe('XSS detected')
      expect(event.details).toEqual({ field: 'comment' })
      expect(event.timestamp).toBeDefined()
      expect(event.url).toBeDefined()
      expect(event.userAgent).toBeDefined()
    })

    it('should include ISO timestamp', () => {
      configureSecurityLogger({
        enabled: true,
        logToConsole: false,
        logToServer: true,
        serverEndpoint: '/api/security-logs',
      })

      logSecurityEvent('xss_attempt', 'high', 'Test')

      const events = getQueuedEvents()
      const timestamp = events[0].timestamp

      // Should be valid ISO date
      expect(() => new Date(timestamp)).not.toThrow()
      expect(new Date(timestamp).toISOString()).toBe(timestamp)
    })
  })

  describe('all event types can be logged', () => {
    const eventTypes: SecurityEventType[] = [
      'xss_attempt',
      'csrf_validation_failed',
      'rate_limit_exceeded',
      'authentication_failed',
      'authorization_failed',
      'suspicious_input',
      'invalid_token',
      'session_expired',
      'storage_error',
      'encryption_error',
      'validation_error',
      'security_header_missing',
      'unsafe_redirect',
      'file_upload_blocked',
      'sql_injection_attempt',
      'path_traversal_attempt',
    ]

    for (const eventType of eventTypes) {
      it(`should log ${eventType} event type`, () => {
        configureSecurityLogger({
          enabled: true,
          logToConsole: false,
          logToServer: true,
          serverEndpoint: '/api/logs',
        })

        logSecurityEvent(eventType, 'medium', `Testing ${eventType}`)

        const events = getQueuedEvents()
        expect(events.some((e) => e.type === eventType)).toBe(true)

        clearEventQueue()
      })
    }
  })

  describe('configureSecurityLogger()', () => {
    it('should merge partial configuration', () => {
      const originalConfig = getSecurityLoggerConfig()

      configureSecurityLogger({ minSeverity: 'high' })

      const newConfig = getSecurityLoggerConfig()
      expect(newConfig.minSeverity).toBe('high')
      expect(newConfig.enabled).toBe(originalConfig.enabled)
    })

    it('should allow enabling server logging', () => {
      configureSecurityLogger({
        logToServer: true,
        serverEndpoint: 'https://api.example.com/logs',
      })

      const config = getSecurityLoggerConfig()
      expect(config.logToServer).toBe(true)
      expect(config.serverEndpoint).toBe('https://api.example.com/logs')
    })
  })

  describe('resetSecurityLoggerConfig()', () => {
    it('should reset to defaults', () => {
      configureSecurityLogger({
        enabled: false,
        minSeverity: 'critical',
        serverEndpoint: 'custom-endpoint',
      })

      resetSecurityLoggerConfig()

      const config = getSecurityLoggerConfig()
      expect(config.enabled).toBe(true)
      expect(config.minSeverity).toBe('low')
    })
  })

  describe('event queue management', () => {
    it('should queue events for server', () => {
      configureSecurityLogger({
        enabled: true,
        logToConsole: false,
        logToServer: true,
        serverEndpoint: '/api/logs',
      })

      logSecurityEvent('xss_attempt', 'high', 'Event 1')
      logSecurityEvent('csrf_validation_failed', 'high', 'Event 2')

      const events = getQueuedEvents()
      expect(events.length).toBe(2)
    })

    it('should clear queue', () => {
      configureSecurityLogger({
        enabled: true,
        logToConsole: false,
        logToServer: true,
        serverEndpoint: '/api/logs',
      })

      logSecurityEvent('xss_attempt', 'high', 'Event')
      expect(getQueuedEvents().length).toBe(1)

      clearEventQueue()
      expect(getQueuedEvents().length).toBe(0)
    })
  })

  describe('securityLogger convenience methods', () => {
    beforeEach(() => {
      configureSecurityLogger({
        enabled: true,
        logToConsole: false,
        logToServer: true,
        serverEndpoint: '/api/logs',
      })
    })

    describe('xssAttempt()', () => {
      it('should log XSS attempt with correct type and severity', () => {
        securityLogger.xssAttempt('<script>alert(1)</script>', 'comment-field')

        const events = getQueuedEvents()
        expect(events.length).toBe(1)
        expect(events[0].type).toBe('xss_attempt')
        expect(events[0].severity).toBe('high')
        expect(events[0].details?.context).toBe('comment-field')
      })

      it('should truncate long input', () => {
        const longInput = 'a'.repeat(500)
        securityLogger.xssAttempt(longInput)

        const events = getQueuedEvents()
        expect((events[0].details?.input as string).length).toBeLessThanOrEqual(200)
      })
    })

    describe('csrfFailed()', () => {
      it('should log CSRF failure', () => {
        securityLogger.csrfFailed('/api/submit')

        const events = getQueuedEvents()
        expect(events[0].type).toBe('csrf_validation_failed')
        expect(events[0].severity).toBe('high')
        expect(events[0].details?.endpoint).toBe('/api/submit')
      })
    })

    describe('rateLimitExceeded()', () => {
      it('should log rate limit with action and limit', () => {
        securityLogger.rateLimitExceeded('chat-messages', 20)

        const events = getQueuedEvents()
        expect(events[0].type).toBe('rate_limit_exceeded')
        expect(events[0].severity).toBe('medium')
        expect(events[0].details?.action).toBe('chat-messages')
        expect(events[0].details?.limit).toBe(20)
      })
    })

    describe('authFailed()', () => {
      it('should log authentication failure', () => {
        securityLogger.authFailed('invalid_password', 'user@example.com')

        const events = getQueuedEvents()
        expect(events[0].type).toBe('authentication_failed')
        expect(events[0].details?.reason).toBe('invalid_password')
        expect(events[0].details?.userId).toBe('user@example.com')
      })
    })

    describe('authzFailed()', () => {
      it('should log authorization failure', () => {
        securityLogger.authzFailed('/admin/users', 'delete', 'user-123')

        const events = getQueuedEvents()
        expect(events[0].type).toBe('authorization_failed')
        expect(events[0].details?.resource).toBe('/admin/users')
        expect(events[0].details?.action).toBe('delete')
        expect(events[0].details?.userId).toBe('user-123')
      })
    })

    describe('suspiciousInput()', () => {
      it('should log suspicious input', () => {
        securityLogger.suspiciousInput('DROP TABLE users;', 'search-query')

        const events = getQueuedEvents()
        expect(events[0].type).toBe('suspicious_input')
        expect(events[0].details?.field).toBe('search-query')
      })
    })

    describe('invalidToken()', () => {
      it('should log invalid token', () => {
        securityLogger.invalidToken('JWT', 'expired')

        const events = getQueuedEvents()
        expect(events[0].type).toBe('invalid_token')
        expect(events[0].details?.tokenType).toBe('JWT')
        expect(events[0].details?.reason).toBe('expired')
      })
    })

    describe('sessionExpired()', () => {
      it('should log session expiration', () => {
        securityLogger.sessionExpired('user-456')

        const events = getQueuedEvents()
        expect(events[0].type).toBe('session_expired')
        expect(events[0].severity).toBe('low')
        expect(events[0].details?.userId).toBe('user-456')
      })
    })

    describe('validationError()', () => {
      it('should log validation error', () => {
        securityLogger.validationError('email', 'Invalid email format')

        const events = getQueuedEvents()
        expect(events[0].type).toBe('validation_error')
        expect(events[0].details?.field).toBe('email')
        expect(events[0].details?.message).toBe('Invalid email format')
      })
    })

    describe('fileUploadBlocked()', () => {
      it('should log blocked file upload', () => {
        securityLogger.fileUploadBlocked('virus.exe', 'Dangerous file type')

        const events = getQueuedEvents()
        expect(events[0].type).toBe('file_upload_blocked')
        expect(events[0].details?.filename).toBe('virus.exe')
        expect(events[0].details?.reason).toBe('Dangerous file type')
      })
    })

    describe('sqlInjectionAttempt()', () => {
      it('should log SQL injection with critical severity', () => {
        securityLogger.sqlInjectionAttempt("' OR 1=1 --", 'login-form')

        const events = getQueuedEvents()
        expect(events[0].type).toBe('sql_injection_attempt')
        expect(events[0].severity).toBe('critical')
        expect(events[0].details?.context).toBe('login-form')
      })
    })

    describe('pathTraversalAttempt()', () => {
      it('should log path traversal attempt', () => {
        securityLogger.pathTraversalAttempt('../../../etc/passwd')

        const events = getQueuedEvents()
        expect(events[0].type).toBe('path_traversal_attempt')
        expect(events[0].severity).toBe('high')
        expect(events[0].details?.path).toBe('../../../etc/passwd')
      })
    })
  })

  describe('browser context', () => {
    it('should include URL in events', () => {
      configureSecurityLogger({
        enabled: true,
        logToConsole: false,
        logToServer: true,
        serverEndpoint: '/api/logs',
      })

      logSecurityEvent('xss_attempt', 'high', 'Test')

      const events = getQueuedEvents()
      expect(events[0].url).toBeDefined()
    })

    it('should include userAgent in events', () => {
      configureSecurityLogger({
        enabled: true,
        logToConsole: false,
        logToServer: true,
        serverEndpoint: '/api/logs',
      })

      logSecurityEvent('xss_attempt', 'high', 'Test')

      const events = getQueuedEvents()
      expect(events[0].userAgent).toBeDefined()
    })
  })

  describe('severity ordering', () => {
    it('should filter events below minimum severity', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      configureSecurityLogger({
        enabled: true,
        logToConsole: true,
        logToServer: false,
        minSeverity: 'medium',
      })

      logSecurityEvent('session_expired', 'low', 'Should not log')
      expect(consoleSpy).not.toHaveBeenCalled()

      logSecurityEvent('rate_limit_exceeded', 'medium', 'Should log')
      expect(warnSpy).toHaveBeenCalled()

      logSecurityEvent('xss_attempt', 'high', 'Should log')
      expect(errorSpy).toHaveBeenCalled()
    })

    it('should include critical severity when minSeverity is critical', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      configureSecurityLogger({
        enabled: true,
        logToConsole: true,
        logToServer: false,
        minSeverity: 'critical',
      })

      logSecurityEvent('xss_attempt', 'high', 'Should not log')
      expect(errorSpy).not.toHaveBeenCalled()

      logSecurityEvent('sql_injection_attempt', 'critical', 'Should log')
      expect(errorSpy).toHaveBeenCalled()
    })
  })
})
