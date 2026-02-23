/**
 * Security Utilities Index
 *
 * Re-exports all security-related utilities for easy importing.
 */

export {
  RateLimiter,
  createApiRateLimiter,
  createFormRateLimiter,
  createChatRateLimiter,
} from './rate-limiter'

export {
  sanitizeHtml,
  sanitizeHtmlStrict,
  containsXSS,
  escapeHtml,
  sanitizeUrl,
  getAllowedTags,
  getAllowedAttributes,
  type SafeMarkdownOptions,
} from './sanitization'

export {
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
  type CSRFTokenHookResult,
} from './csrf-protection'

export {
  setSecureItem,
  getSecureItem,
  removeSecureItem,
  clearSecureStorage,
  hasSecureItem,
  getSecureItemMetadata,
  isSecureStorageAvailable,
} from './secure-storage'

export {
  logSecurityEvent,
  securityLogger,
  configureSecurityLogger,
  getSecurityLoggerConfig,
  resetSecurityLoggerConfig,
  getQueuedEvents,
  clearEventQueue,
  type SecurityEvent,
  type SecurityEventType,
  type SecurityEventSeverity,
  type SecurityLoggerConfig,
} from './security-logger'
