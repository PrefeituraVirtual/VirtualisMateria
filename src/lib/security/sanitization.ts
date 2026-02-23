/**
 * HTML/Markdown Sanitization Utilities
 *
 * Provides robust XSS protection for user-generated content.
 * Uses allowlist approach for safe HTML rendering.
 */

/**
 * Event handler attribute pattern for XSS detection.
 */
const EVENT_HANDLER_PATTERN =
  /\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi

/**
 * JavaScript URL pattern for XSS detection.
 */
const JAVASCRIPT_URL_PATTERN = /javascript\s*:/gi

/**
 * Dangerous HTML tags that should always be removed.
 */
const DANGEROUS_TAGS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'select',
  'textarea',
  'link',
  'meta',
  'base',
  'applet',
  'frame',
  'frameset',
  'layer',
  'ilayer',
  'bgsound',
  'xml',
]

/**
 * Allowed HTML tags for safe markdown rendering.
 */
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'del',
  'ins',
  'mark',
  'small',
  'sub',
  'sup',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'pre',
  'code',
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'hr',
  'div',
  'span',
  'a',
  'img',
  'figure',
  'figcaption',
  'abbr',
  'cite',
  'kbd',
  'samp',
  'var',
  'time',
  'address',
  'details',
  'summary',
]

/**
 * Allowed attributes for safe tags.
 */
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan', 'scope'],
  '*': ['class', 'id', 'lang', 'dir'],
}

/**
 * Removes dangerous HTML tags completely (including content).
 */
function removeDangerousTags(html: string): string {
  let result = html

  for (const tag of DANGEROUS_TAGS) {
    // Remove opening and closing tags with content
    const tagPattern = new RegExp(
      `<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`,
      'gi'
    )
    result = result.replace(tagPattern, '')

    // Remove self-closing tags
    const selfClosingPattern = new RegExp(`<${tag}[^>]*\\/?>`, 'gi')
    result = result.replace(selfClosingPattern, '')
  }

  return result
}

/**
 * Removes event handler attributes from HTML.
 */
function removeEventHandlers(html: string): string {
  return html.replace(EVENT_HANDLER_PATTERN, '')
}

/**
 * Removes javascript: URLs from href and src attributes.
 */
function removeJavaScriptUrls(html: string): string {
  // Remove javascript: from href
  let result = html.replace(
    /href\s*=\s*["']?\s*javascript:[^"'>\s]*/gi,
    'href="#"'
  )

  // Remove javascript: from src
  result = result.replace(
    /src\s*=\s*["']?\s*javascript:[^"'>\s]*/gi,
    'src=""'
  )

  // Remove expressions in style attributes
  result = result.replace(
    /style\s*=\s*["'][^"']*expression\s*\([^)]*\)[^"']*["']/gi,
    ''
  )

  // Remove javascript: in style url()
  result = result.replace(
    /style\s*=\s*["'][^"']*url\s*\(\s*["']?\s*javascript:[^)]*\)[^"']*["']/gi,
    ''
  )

  return result
}

/**
 * Removes potentially dangerous data URLs.
 */
function removeDangerousDataUrls(html: string): string {
  // Keep safe data URLs (images) but remove potentially dangerous ones
  return html.replace(
    /(?:src|href)\s*=\s*["']data:(?!image\/)[^"']*["']/gi,
    ''
  )
}

/**
 * Sanitizes HTML content by removing XSS vectors.
 *
 * @param html - Raw HTML content
 * @returns Sanitized HTML safe for rendering
 *
 * @example
 * ```typescript
 * const dirty = '<script>alert("xss")</script><p>Hello</p>'
 * const clean = sanitizeHtml(dirty)
 * // Returns: '<p>Hello</p>'
 * ```
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  let result = html

  // Step 1: Remove dangerous tags with their content
  result = removeDangerousTags(result)

  // Step 2: Remove event handlers
  result = removeEventHandlers(result)

  // Step 3: Remove javascript: URLs
  result = removeJavaScriptUrls(result)

  // Step 4: Remove dangerous data URLs
  result = removeDangerousDataUrls(result)

  // Step 5: Remove any remaining dangerous patterns
  result = result.replace(JAVASCRIPT_URL_PATTERN, '')

  return result.trim()
}

/**
 * Strictly sanitizes HTML by only allowing specific tags.
 * More aggressive than sanitizeHtml - removes ALL non-allowed tags.
 *
 * @param html - Raw HTML content
 * @returns Strictly sanitized HTML
 */
export function sanitizeHtmlStrict(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  // First apply basic sanitization
  let result = sanitizeHtml(html)

  // Build regex for allowed tags
  const allowedTagsPattern = ALLOWED_TAGS.join('|')

  // Remove any tags not in allowed list (but keep their content)
  const tagPattern = new RegExp(
    `<(?!\\/?(${allowedTagsPattern})(?:\\s|>|\\/))([^>]*)>`,
    'gi'
  )
  result = result.replace(tagPattern, '')

  return result.trim()
}

/**
 * Checks if a string contains potential XSS payloads.
 *
 * @param text - Text to check
 * @returns true if XSS vectors detected
 */
export function containsXSS(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false
  }

  // Check for script tags
  if (/<script/i.test(text)) {
    return true
  }

  // Check for event handlers (create fresh regex to avoid global state issues)
  const eventHandlerPattern = /\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/i
  if (eventHandlerPattern.test(text)) {
    return true
  }

  // Check for javascript: URLs (create fresh regex)
  const javascriptUrlPattern = /javascript\s*:/i
  if (javascriptUrlPattern.test(text)) {
    return true
  }

  // Check for SVG with event handlers
  if (/<svg[^>]*on\w+/i.test(text)) {
    return true
  }

  // Check for data: URLs with potentially dangerous content
  if (/data:[^,]*;base64/i.test(text) && !/data:image/i.test(text)) {
    return true
  }

  // Check for expression() in CSS
  if (/expression\s*\(/i.test(text)) {
    return true
  }

  // Check for vbscript:
  if (/vbscript\s*:/i.test(text)) {
    return true
  }

  return false
}

/**
 * Escapes HTML special characters for safe text display.
 *
 * @param text - Text to escape
 * @returns Escaped text
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  }

  return text.replace(/[&<>"'`=/]/g, (char) => escapeMap[char] || char)
}

/**
 * Sanitizes a URL to prevent javascript: and other dangerous schemes.
 *
 * @param url - URL to sanitize
 * @returns Safe URL or empty string if dangerous
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return ''
  }

  const trimmed = url.trim().toLowerCase()

  // Allow relative URLs
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('?')) {
    return url.trim()
  }

  // Allow safe protocols
  const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:']
  for (const protocol of safeProtocols) {
    if (trimmed.startsWith(protocol)) {
      return url.trim()
    }
  }

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'vbscript:', 'data:']
  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return ''
    }
  }

  // If no protocol, assume relative URL
  if (!trimmed.includes(':')) {
    return url.trim()
  }

  return ''
}

/**
 * Configuration options for SafeMarkdown rendering.
 */
export interface SafeMarkdownOptions {
  allowedTags?: string[]
  allowLinks?: boolean
  allowImages?: boolean
  linkTarget?: '_blank' | '_self'
}

/**
 * Gets the list of allowed tags for SafeMarkdown.
 */
export function getAllowedTags(): string[] {
  return [...ALLOWED_TAGS]
}

/**
 * Gets the list of allowed attributes for a tag.
 */
export function getAllowedAttributes(tag: string): string[] {
  const tagAttrs = ALLOWED_ATTRIBUTES[tag] || []
  const globalAttrs = ALLOWED_ATTRIBUTES['*'] || []
  return [...new Set([...tagAttrs, ...globalAttrs])]
}
