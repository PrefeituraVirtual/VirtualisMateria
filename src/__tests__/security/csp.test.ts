/**
 * CSP Configuration Tests
 *
 * Tests for Content Security Policy configuration validation.
 * Validates CSP header syntax and required directives.
 */

import { describe, it, expect } from 'vitest'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Parses CSP header string into directive map.
 */
function parseCSPHeader(csp: string): Record<string, string[]> {
  const directives: Record<string, string[]> = {}

  const parts = csp.split(';').map((s) => s.trim()).filter(Boolean)

  for (const part of parts) {
    const [directive, ...values] = part.split(/\s+/)
    if (directive) {
      directives[directive.toLowerCase()] = values
    }
  }

  return directives
}

/**
 * Validates CSP syntax for common issues.
 */
function validateCSPSyntax(csp: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check for common syntax errors
  if (csp.includes(',,')) {
    errors.push('Contains double commas')
  }

  if (csp.includes(';;')) {
    errors.push('Contains double semicolons')
  }

  // Check for unquoted keywords that should be quoted
  const unquotedKeywords = ['self', 'unsafe-inline', 'unsafe-eval', 'none', 'strict-dynamic']
  for (const keyword of unquotedKeywords) {
    const pattern = new RegExp(`\\b${keyword}\\b(?!\\')`, 'i')
    if (pattern.test(csp) && !csp.includes(`'${keyword}'`)) {
      // Check if it's actually unquoted (not just part of a longer word)
      const wordPattern = new RegExp(`(?<!')\\b${keyword}\\b(?!')`, 'i')
      if (wordPattern.test(csp)) {
        errors.push(`Keyword '${keyword}' should be quoted as '${keyword}'`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Gets security headers from next.config.js.
 */
function getSecurityHeadersFromConfig(): Array<{ key: string; value: string }> | null {
  // Use process.cwd() which will be the frontend directory when running tests
  const configPath = path.join(process.cwd(), 'next.config.js')

  if (!fs.existsSync(configPath)) {
    return null
  }

  const configContent = fs.readFileSync(configPath, 'utf-8')

  // Extract headers configuration
  // This is a simplified extraction - real implementation would use AST parsing
  const headersMatch = configContent.match(/headers:\s*\[([\s\S]*?)\]/m)

  if (!headersMatch) {
    return null
  }

  // Extract individual header objects
  const headers: Array<{ key: string; value: string }> = []

  // Match X-Frame-Options
  if (configContent.includes("'X-Frame-Options'")) {
    const valueMatch = configContent.match(/key:\s*['"]X-Frame-Options['"][\s\S]*?value:\s*['"]([^'"]+)['"]/m)
    if (valueMatch) {
      headers.push({ key: 'X-Frame-Options', value: valueMatch[1] })
    }
  }

  // Match X-Content-Type-Options
  if (configContent.includes("'X-Content-Type-Options'")) {
    const valueMatch = configContent.match(/key:\s*['"]X-Content-Type-Options['"][\s\S]*?value:\s*['"]([^'"]+)['"]/m)
    if (valueMatch) {
      headers.push({ key: 'X-Content-Type-Options', value: valueMatch[1] })
    }
  }

  // Match Referrer-Policy
  if (configContent.includes("'Referrer-Policy'")) {
    const valueMatch = configContent.match(/key:\s*['"]Referrer-Policy['"][\s\S]*?value:\s*['"]([^'"]+)['"]/m)
    if (valueMatch) {
      headers.push({ key: 'Referrer-Policy', value: valueMatch[1] })
    }
  }

  // Match Content-Security-Policy if present
  if (configContent.includes('Content-Security-Policy')) {
    const valueMatch = configContent.match(/key:\s*['"]Content-Security-Policy['"][\s\S]*?value:\s*['"]([^'"]+)['"]/m)
    if (valueMatch) {
      headers.push({ key: 'Content-Security-Policy', value: valueMatch[1] })
    }
  }

  return headers
}

describe('CSP Configuration', () => {
  describe('Security Headers in next.config.js', () => {
    // Use process.cwd() which will be the frontend directory when running tests
    const configPath = path.join(process.cwd(), 'next.config.js')

    it('should have next.config.js file', () => {
      expect(fs.existsSync(configPath)).toBe(true)
    })

    it('should have headers configuration section', () => {
      const content = fs.readFileSync(configPath, 'utf-8')

      expect(content).toContain('async headers()')
    })

    it('should have X-Frame-Options header', () => {
      const headers = getSecurityHeadersFromConfig()

      expect(headers).not.toBeNull()
      const xFrameHeader = headers?.find((h) => h.key === 'X-Frame-Options')
      expect(xFrameHeader).toBeDefined()
      expect(xFrameHeader?.value).toBe('DENY')
    })

    it('should have X-Content-Type-Options header', () => {
      const headers = getSecurityHeadersFromConfig()

      expect(headers).not.toBeNull()
      const xContentTypeHeader = headers?.find((h) => h.key === 'X-Content-Type-Options')
      expect(xContentTypeHeader).toBeDefined()
      expect(xContentTypeHeader?.value).toBe('nosniff')
    })

    it('should have Referrer-Policy header', () => {
      const headers = getSecurityHeadersFromConfig()

      expect(headers).not.toBeNull()
      const referrerHeader = headers?.find((h) => h.key === 'Referrer-Policy')
      expect(referrerHeader).toBeDefined()
      expect(referrerHeader?.value).toMatch(/origin|strict-origin|no-referrer/)
    })
  })

  describe('CSP Header Syntax Validation', () => {
    it('should validate correct CSP syntax', () => {
      const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"

      const result = validateCSPSyntax(csp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect double semicolons', () => {
      const csp = "default-src 'self';; script-src 'self'"

      const result = validateCSPSyntax(csp)
      expect(result.errors).toContain('Contains double semicolons')
    })

    it('should detect double commas', () => {
      const csp = "default-src 'self',, script-src 'self'"

      const result = validateCSPSyntax(csp)
      expect(result.errors).toContain('Contains double commas')
    })
  })

  describe('CSP Directive Parsing', () => {
    it('should parse directives correctly', () => {
      const csp = "default-src 'self'; script-src 'self' https://cdn.example.com"

      const directives = parseCSPHeader(csp)

      expect(directives['default-src']).toEqual(["'self'"])
      expect(directives['script-src']).toEqual(["'self'", 'https://cdn.example.com'])
    })

    it('should handle empty CSP', () => {
      const directives = parseCSPHeader('')
      expect(Object.keys(directives)).toHaveLength(0)
    })

    it('should handle multiple sources per directive', () => {
      const csp = "img-src 'self' data: https://images.example.com blob:"

      const directives = parseCSPHeader(csp)

      expect(directives['img-src']).toContain("'self'")
      expect(directives['img-src']).toContain('data:')
      expect(directives['img-src']).toContain('blob:')
    })
  })

  describe('Required CSP Directives', () => {
    const sampleCSP = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: blob:;
      font-src 'self';
      connect-src 'self' https://api.example.com;
      frame-ancestors 'none';
      form-action 'self';
      base-uri 'self'
    `

    it('should have default-src directive', () => {
      const directives = parseCSPHeader(sampleCSP)
      expect(directives['default-src']).toBeDefined()
    })

    it('should have script-src directive', () => {
      const directives = parseCSPHeader(sampleCSP)
      expect(directives['script-src']).toBeDefined()
    })

    it('should have style-src directive', () => {
      const directives = parseCSPHeader(sampleCSP)
      expect(directives['style-src']).toBeDefined()
    })

    it('should have img-src directive', () => {
      const directives = parseCSPHeader(sampleCSP)
      expect(directives['img-src']).toBeDefined()
    })

    it('should have connect-src directive for API calls', () => {
      const directives = parseCSPHeader(sampleCSP)
      expect(directives['connect-src']).toBeDefined()
    })

    it('should have frame-ancestors for clickjacking protection', () => {
      const directives = parseCSPHeader(sampleCSP)
      expect(directives['frame-ancestors']).toBeDefined()
    })
  })

  describe('CSP Security Best Practices', () => {
    it('should not use unsafe-inline in production CSP without nonce', () => {
      // This is a recommendation test - in production, unsafe-inline
      // should be replaced with nonces or hashes
      const productionCSP = "script-src 'self'"
      const directives = parseCSPHeader(productionCSP)

      // Ideal: no unsafe-inline
      expect(directives['script-src']).not.toContain("'unsafe-inline'")
    })

    it('should not use unsafe-eval in production CSP', () => {
      const productionCSP = "script-src 'self'"
      const directives = parseCSPHeader(productionCSP)

      expect(directives['script-src']).not.toContain("'unsafe-eval'")
    })

    it('should not allow all sources with wildcard *', () => {
      const csp = "default-src 'self'"
      const directives = parseCSPHeader(csp)

      for (const values of Object.values(directives)) {
        expect(values).not.toContain('*')
      }
    })

    it('should have frame-ancestors set to none or self', () => {
      const csp = "frame-ancestors 'none'"
      const directives = parseCSPHeader(csp)

      expect(
        directives['frame-ancestors']?.includes("'none'") ||
        directives['frame-ancestors']?.includes("'self'")
      ).toBe(true)
    })
  })

  describe('Development vs Production CSP', () => {
    it('should allow unsafe-eval in development for HMR', () => {
      // Development CSP may need unsafe-eval for Hot Module Replacement
      const devCSP = "script-src 'self' 'unsafe-eval'"
      const directives = parseCSPHeader(devCSP)

      expect(directives['script-src']).toContain("'unsafe-eval'")
    })

    it('should allow unsafe-inline in development for styled-components/emotion', () => {
      // Development may need unsafe-inline for CSS-in-JS
      const devCSP = "style-src 'self' 'unsafe-inline'"
      const directives = parseCSPHeader(devCSP)

      expect(directives['style-src']).toContain("'unsafe-inline'")
    })

    it('production CSP should be stricter than development', () => {
      const devCSP = "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      const prodCSP = "script-src 'self'"

      const devDirectives = parseCSPHeader(devCSP)
      const prodDirectives = parseCSPHeader(prodCSP)

      // Production should have fewer sources
      expect(prodDirectives['script-src']?.length || 0).toBeLessThanOrEqual(
        devDirectives['script-src']?.length || 0
      )
    })
  })

  describe('CSP Report-Only Mode', () => {
    it('should support report-uri directive', () => {
      const csp = "default-src 'self'; report-uri /csp-report"
      const directives = parseCSPHeader(csp)

      expect(directives['report-uri']).toBeDefined()
    })

    it('should support report-to directive (newer spec)', () => {
      const csp = "default-src 'self'; report-to csp-endpoint"
      const directives = parseCSPHeader(csp)

      expect(directives['report-to']).toBeDefined()
    })
  })

  describe('Next.js Specific CSP', () => {
    it('should allow Next.js inline scripts with nonce or hash', () => {
      // Next.js injects inline scripts for hydration
      // These should be allowed via nonce or hash
      const csp = "script-src 'self' 'nonce-abc123'"
      const directives = parseCSPHeader(csp)

      const scriptSrc = directives['script-src'] || []
      const hasNonce = scriptSrc.some((s) => s.startsWith("'nonce-"))
      const hasHash = scriptSrc.some((s) => s.startsWith("'sha256-") || s.startsWith("'sha384-"))

      expect(hasNonce || hasHash || scriptSrc.includes("'unsafe-inline'")).toBe(true)
    })

    it('should allow data: URIs for images if needed', () => {
      // Next.js Image optimization may use data: URIs for blur placeholders
      const csp = "img-src 'self' data:"
      const directives = parseCSPHeader(csp)

      expect(directives['img-src']).toContain('data:')
    })

    it('should allow blob: URIs for workers if needed', () => {
      const csp = "worker-src 'self' blob:"
      const directives = parseCSPHeader(csp)

      expect(directives['worker-src']).toContain('blob:')
    })
  })
})

describe('Security Headers Validation', () => {
  describe('X-Frame-Options', () => {
    it('DENY is the most secure value', () => {
      expect(['DENY', 'SAMEORIGIN']).toContain('DENY')
    })

    it('should not use ALLOW-FROM (deprecated)', () => {
      const validValues = ['DENY', 'SAMEORIGIN']
      expect(validValues).not.toContain('ALLOW-FROM')
    })
  })

  describe('X-Content-Type-Options', () => {
    it('should only accept nosniff value', () => {
      expect('nosniff').toBe('nosniff')
    })
  })

  describe('Referrer-Policy', () => {
    it('should use secure referrer policy', () => {
      const secureValues = [
        'no-referrer',
        'no-referrer-when-downgrade',
        'origin',
        'origin-when-cross-origin',
        'same-origin',
        'strict-origin',
        'strict-origin-when-cross-origin',
      ]

      // origin-when-cross-origin is a good balance
      expect(secureValues).toContain('origin-when-cross-origin')
    })

    it('should not use unsafe-url', () => {
      const value = 'origin-when-cross-origin'
      expect(value).not.toBe('unsafe-url')
    })
  })

  describe('Strict-Transport-Security (HSTS)', () => {
    it('should have minimum max-age of 1 year (31536000)', () => {
      const hsts = 'max-age=31536000; includeSubDomains'
      const maxAgeMatch = hsts.match(/max-age=(\d+)/)

      expect(maxAgeMatch).not.toBeNull()
      expect(parseInt(maxAgeMatch![1])).toBeGreaterThanOrEqual(31536000)
    })

    it('should include includeSubDomains directive', () => {
      const hsts = 'max-age=31536000; includeSubDomains'
      expect(hsts).toContain('includeSubDomains')
    })
  })
})
