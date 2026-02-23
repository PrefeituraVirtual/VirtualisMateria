# Security Documentation - Materia Virtualis Frontend

This document provides comprehensive documentation of all security measures implemented in the Materia Virtualis frontend application.

## Table of Contents

1. [Overview](#overview)
2. [Content Security Policy (CSP)](#content-security-policy-csp)
3. [Rate Limiting](#rate-limiting)
4. [Token Storage](#token-storage)
5. [CSRF Protection](#csrf-protection)
6. [Content Sanitization](#content-sanitization)
7. [Security Headers](#security-headers)
8. [Security Logging](#security-logging)
9. [Best Practices](#best-practices)
10. [Security Checklist](#security-checklist)
11. [Incident Response](#incident-response)

## Overview

The Materia Virtualis frontend implements defense-in-depth security with multiple layers of protection:

| Protection Layer | Purpose | Implementation |
|-----------------|---------|----------------|
| CSP Headers | Mitigate XSS attacks | `next.config.js` |
| Rate Limiting | Prevent API abuse | `rate-limiter.ts` |
| Secure Storage | Protect tokens at rest | `secure-storage.ts` |
| CSRF Protection | Prevent cross-site attacks | `csrf-protection.ts` |
| Content Sanitization | Prevent XSS in content | `markdown-sanitizer.ts` |
| Security Logging | Detect and audit threats | `security-logger.ts` |

## Content Security Policy (CSP)

CSP headers are configured in `next.config.js` to restrict resource loading.

### Current Directives

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' (dev) / 'self' 'unsafe-inline' (prod);
style-src 'self' 'unsafe-inline';
img-src 'self' data: https: blob:;
font-src 'self' data:;
connect-src 'self' [API_URLS];
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none';
upgrade-insecure-requests (prod only);
```

### Modifying CSP

To add a new script source (e.g., analytics):

```javascript
// In next.config.js headers() function
const cspDirectives = [
  // ... existing directives
  `script-src 'self' 'unsafe-inline' https://analytics.example.com`,
];
```

**Warning**: Only add trusted domains. Each addition increases attack surface.

### CSP Violations

CSP violations are logged to the browser console. In production, consider adding a report-uri:

```javascript
`report-uri /api/csp-report;`
```

## Rate Limiting

Client-side rate limiting prevents API abuse using a Token Bucket algorithm.

### Configuration

| Limiter | Limit | Purpose |
|---------|-------|---------|
| `apiRateLimiter` | 60/min | General API calls |
| `chatRateLimiter` | 10/min | Chatbot messages |
| `uploadRateLimiter` | 5/min | File uploads |
| `analysisRateLimiter` | 3/min | AI analysis requests |

### Usage

```typescript
import { chatRateLimiter, RateLimitError } from '@/lib/rate-limiter';

async function sendMessage(message: string) {
  if (!chatRateLimiter.tryConsume()) {
    const waitTime = chatRateLimiter.getTimeUntilNextToken();
    throw new RateLimitError(
      `Rate limit exceeded. Wait ${Math.ceil(waitTime / 1000)}s`,
      waitTime,
      'chat'
    );
  }
  // Proceed with message
}
```

### Adjusting Limits

```typescript
// In rate-limiter.ts
export const chatRateLimiter = new RateLimiter({
  maxTokens: 20,        // Increase limit
  refillRate: 20 / 60,  // 20 per minute
  name: 'chat',
});
```

### Skip Rate Limiting

For specific requests:

```typescript
await apiClient.post('/api/endpoint', data, {
  skipRateLimit: true,
});
```

## Token Storage

Authentication tokens are stored with encryption using Web Crypto API.

### Architecture

```
+----------------+     +------------------+     +------------------+
| Plain Token    | --> | AES-256-GCM      | --> | localStorage     |
|                |     | Encryption       |     | (encrypted)      |
+----------------+     +------------------+     +------------------+
                              ^
                              |
                    +------------------+
                    | Session Key      |
                    | (memory only)    |
                    +------------------+
```

### Usage

```typescript
import { secureStorage } from '@/lib/secure-storage';

// Store token
await secureStorage.setSecureItem('authToken', token, {
  ttl: 24 * 60 * 60 * 1000, // 24 hours
});

// Retrieve token
const token = await secureStorage.getSecureItem('authToken');

// Remove token
await secureStorage.removeSecureItem('authToken');
```

### Security Properties

- **Encryption**: AES-256-GCM
- **Key Storage**: Memory only (lost on page refresh)
- **TTL**: Default 24 hours
- **Fallback**: Plain localStorage (with warning) if Crypto API unavailable

### Future: httpOnly Cookies

For maximum security, migrate to httpOnly cookies:

1. Backend sets `Set-Cookie` with `httpOnly`, `secure`, `sameSite=strict`
2. Frontend removes token from client storage
3. Cookies automatically sent with requests

## CSRF Protection

Cross-Site Request Forgery protection for state-changing operations.

### How It Works

```
1. Page Load --> Generate CSRF Token (client)
2. Store Token --> sessionStorage (30-min expiry)
3. Form Submit --> Include token in request
4. Server validates --> Compare with session token
```

### Usage in Forms

```typescript
import { useCSRFToken } from '@/lib/csrf-protection';

function MyForm() {
  const { token, isReady } = useCSRFToken();

  const handleSubmit = async (data) => {
    const response = await apiClient.post('/api/endpoint', {
      ...data,
      _csrf: token,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="_csrf" value={token} />
      {/* form fields */}
    </form>
  );
}
```

### Automatic Header Injection

The API client automatically adds CSRF tokens to mutating requests:

```typescript
// Automatic for POST, PUT, PATCH, DELETE
await apiClient.post('/api/endpoint', data);
// Header X-CSRF-Token is automatically added
```

### Skip CSRF

For endpoints that don't need CSRF:

```typescript
await apiClient.post('/api/public-endpoint', data, {
  skipCSRF: true,
});
```

## Content Sanitization

All user-generated content and markdown is sanitized before rendering.

### SafeMarkdown Component

```typescript
import { SafeMarkdown } from '@/lib/markdown-sanitizer';

function MessageDisplay({ content }) {
  return <SafeMarkdown content={content} className="prose" />;
}
```

### Sanitization Rules

**Allowed Tags**:
- Text: `p`, `br`, `span`, `div`
- Formatting: `strong`, `em`, `u`, `code`, `pre`
- Lists: `ul`, `ol`, `li`
- Headings: `h1`-`h6`
- Tables: `table`, `thead`, `tbody`, `tr`, `th`, `td`
- Links: `a` (with sanitized href)
- Quotes: `blockquote`

**Blocked**:
- All `<script>` tags
- All event handlers (`onclick`, `onerror`, etc.)
- `javascript:` URLs
- `data:` URLs in links
- Embedded objects (`object`, `embed`, `iframe`)

### Direct HTML Sanitization

```typescript
import { sanitizeHtml } from '@/lib/markdown-sanitizer';

const cleanHtml = sanitizeHtml(untrustedHtml);
```

### When to Use

| Scenario | Solution |
|----------|----------|
| Markdown from AI/chat | `SafeMarkdown` component |
| HTML from database | `sanitizeHtml()` function |
| Form inputs | `sanitizeInput()` from validation.ts |
| URLs | `sanitizeUrl()` function |

## Security Headers

All responses include security headers configured in `next.config.js`.

### Current Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer info |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | Disable APIs |
| `Cross-Origin-Embedder-Policy` | `credentialless` | Cross-origin isolation |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups` | Window isolation |
| `Strict-Transport-Security` | `max-age=31536000` | Force HTTPS (prod) |

## Security Logging

Security events are logged for monitoring and incident response.

### Event Types

```typescript
type SecurityEventType =
  | 'RATE_LIMIT_EXCEEDED'
  | 'CSRF_VALIDATION_FAILED'
  | 'XSS_ATTEMPT_BLOCKED'
  | 'INVALID_TOKEN'
  | 'AUTH_FAILURE'
  | 'AUTHZ_FAILURE'
  | 'SUSPICIOUS_ACTIVITY'
  | 'VALIDATION_FAILURE';
```

### Usage

```typescript
import { logSecurityEvent, securityLogger } from '@/lib/security-logger';

// General logging
logSecurityEvent('SUSPICIOUS_ACTIVITY', 'Multiple failed login attempts', {
  severity: 'WARNING',
  details: { attempts: 5, ip: '...' },
});

// Convenience methods
securityLogger.rateLimitExceeded('chat', 10);
securityLogger.xssAttempt('<script>alert(1)</script>');
securityLogger.csrfFailed('/api/materias');
```

### Log Destinations

- **Development**: `console.warn()`
- **Production**: Batch POST to `/api/security/log`

## Best Practices

### For New Components

1. **User Input**: Always use Zod schemas for validation
2. **Dynamic Content**: Always use `SafeMarkdown` or `sanitizeHtml`
3. **API Calls**: Use the `apiClient` (has rate limiting and CSRF)
4. **Forms**: Include CSRF token via `useCSRFToken` hook
5. **Links**: Use `rel="noopener noreferrer"` for external links

### For New API Endpoints

1. Enable rate limiting by default
2. Include CSRF validation for mutations
3. Validate all inputs on server side
4. Return consistent error responses

### Authentication Flow

```typescript
// Correct: Use apiClient which handles tokens
const data = await apiClient.get('/api/protected');

// Avoid: Manual token handling
const token = localStorage.getItem('token'); // Vulnerable to XSS
```

## Security Checklist

Use this checklist when creating new features:

### Forms
- [ ] Zod schema for validation
- [ ] CSRF token included
- [ ] Rate limiting applied
- [ ] Input sanitization
- [ ] Error messages don't leak info

### Content Display
- [ ] SafeMarkdown for markdown
- [ ] sanitizeHtml for HTML
- [ ] External links have rel="noopener"
- [ ] Images have proper alt text

### API Integration
- [ ] Using apiClient (not raw axios)
- [ ] Error handling doesn't expose stack traces
- [ ] Loading states prevent double-submit
- [ ] Proper authentication checks

### Components
- [ ] No inline event handlers in templates
- [ ] No `dangerouslySetInnerHTML` without sanitization
- [ ] Props validated with TypeScript
- [ ] No sensitive data in client-side logs

## Incident Response

### If XSS Vulnerability Found

1. **Contain**: Identify affected pages/components
2. **Fix**: Add sanitization, update CSP
3. **Verify**: Test with XSS payloads
4. **Deploy**: Emergency release if critical
5. **Review**: Audit similar patterns in codebase

### If Token Compromised

1. **Invalidate**: Rotate JWT secret (backend)
2. **Clear**: Force logout all sessions
3. **Notify**: Alert affected users
4. **Investigate**: Check logs for abuse

### If Rate Limit Bypass Found

1. **Block**: Implement server-side rate limiting
2. **Monitor**: Check for abuse patterns
3. **Adjust**: Tighten client-side limits
4. **Log**: Enable detailed request logging

### Contact

For security concerns, contact the development team immediately.

---

## References

- [OWASP Top 10](https://owasp.org/Top10/)
- [CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
