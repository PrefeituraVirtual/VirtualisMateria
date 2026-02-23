/**
 * Markdown Sanitizer
 *
 * Provides secure markdown rendering utilities using DOMPurify for XSS protection.
 * This module sanitizes HTML content before rendering to prevent cross-site scripting attacks.
 *
 * @module markdown-sanitizer
 */

import DOMPurify from 'isomorphic-dompurify'
import React from 'react'
import ReactMarkdown, { Components } from 'react-markdown'

// ============================================================================
// DOMPurify Configuration
// ============================================================================

/**
 * Whitelist of allowed HTML tags for sanitization.
 * Only these tags will be preserved after sanitization.
 */
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  'code',
  'pre',
  'a',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'span',
  'div',
]

/**
 * Whitelist of allowed HTML attributes for sanitization.
 * Only these attributes will be preserved on allowed tags.
 */
const ALLOWED_ATTR = ['href', 'title', 'class', 'target', 'rel']

/**
 * Regular expression for allowed URI schemes.
 * Only http:, https:, and mailto: protocols are permitted in href attributes.
 */
const ALLOWED_URI_REGEXP = /^(?:(?:https?|mailto):)/i

// ============================================================================
// Sanitization Functions
// ============================================================================

/**
 * Sanitizes HTML string using DOMPurify with strict security configuration.
 *
 * Features:
 * - Removes all event handlers (onclick, onmouseover, etc.)
 * - Only allows safe HTML tags for text formatting
 * - Restricts attributes to a small whitelist
 * - Only permits http:, https:, and mailto: URI schemes
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering
 *
 * @example
 * ```typescript
 * const dirty = '<p onclick="alert(1)">Hello <script>evil()</script></p>'
 * const clean = sanitizeHtml(dirty)
 * // Result: '<p>Hello </p>'
 * ```
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP,
    // Remove all event handlers
    FORBID_ATTR: [
      'onerror',
      'onload',
      'onclick',
      'onmouseover',
      'onmouseout',
      'onmousedown',
      'onmouseup',
      'onkeydown',
      'onkeyup',
      'onkeypress',
      'onfocus',
      'onblur',
      'onchange',
      'onsubmit',
      'onreset',
      'onselect',
      'oninput',
      'onscroll',
      'onresize',
      'ondrag',
      'ondrop',
      'oncopy',
      'oncut',
      'onpaste',
    ],
    // Prevent data: and javascript: URIs
    ALLOW_DATA_ATTR: false,
    // Remove script tags and their content completely
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    // Additional security options
    ADD_ATTR: ['target', 'rel'],
    // Clean up empty attributes
    KEEP_CONTENT: true,
  })
}

/**
 * Sanitizes plain text by escaping HTML entities.
 * Use this when you want to display user input as plain text without any HTML rendering.
 *
 * @param text - The plain text to sanitize
 * @returns Text with HTML entities escaped
 *
 * @example
 * ```typescript
 * const input = '<script>alert("xss")</script>'
 * const safe = sanitizeText(input)
 * // Result: '&lt;script&gt;alert("xss")&lt;/script&gt;'
 * ```
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// ============================================================================
// SafeMarkdown Component
// ============================================================================

/**
 * Props for the SafeMarkdown component
 */
export interface SafeMarkdownProps {
  /** Markdown content to render safely */
  content: string
  /** Additional CSS classes to apply to the container */
  className?: string
  /** Whether to apply prose styling (default: true) */
  prose?: boolean
}

/**
 * Custom link renderer that adds security attributes to all links.
 * Opens links in new tab with noopener noreferrer for security.
 */
const secureComponents: Components = {
  a: ({ href, children, ...props }) => {
    // Validate href protocol
    if (href && !ALLOWED_URI_REGEXP.test(href)) {
      // If protocol is not allowed, render as plain text
      return React.createElement('span', {}, children)
    }

    return React.createElement(
      'a',
      {
        href: href,
        target: '_blank',
        rel: 'noopener noreferrer',
        ...props,
      },
      children
    )
  },
  // Ensure code blocks don't execute
  code: ({ children, className, ...props }) => {
    return React.createElement(
      'code',
      {
        className: className,
        ...props,
      },
      children
    )
  },
  // Sanitize any raw HTML in the markdown
  html: () => {
    // Don't render raw HTML blocks
    return null
  },
}

/**
 * SafeMarkdown Component
 *
 * A secure markdown rendering component that sanitizes content before display.
 * Uses DOMPurify for HTML sanitization and configures ReactMarkdown with secure defaults.
 *
 * Security features:
 * - Sanitizes all markdown content with DOMPurify
 * - Adds rel="noopener noreferrer" to all links
 * - Opens links in new tabs (target="_blank")
 * - Validates URI protocols (only http, https, mailto)
 * - Blocks raw HTML rendering in markdown
 *
 * @example
 * ```tsx
 * // Basic usage
 * <SafeMarkdown content="**Bold** text with [link](https://example.com)" />
 *
 * // With custom className
 * <SafeMarkdown
 *   content="# Heading\n\nParagraph text"
 *   className="text-gray-700"
 * />
 *
 * // Without prose styling
 * <SafeMarkdown
 *   content="Simple text"
 *   prose={false}
 * />
 * ```
 */
export function SafeMarkdown({ content, className = '', prose = true }: SafeMarkdownProps) {
  // Sanitize the content before passing to ReactMarkdown
  const sanitizedContent = sanitizeHtml(content)

  // Build the class string
  const containerClass = [
    prose ? 'prose prose-sm max-w-none dark:prose-invert' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return React.createElement(
    'div',
    { className: containerClass },
    React.createElement(
      ReactMarkdown,
      {
        components: secureComponents,
        // Disable raw HTML rendering for security
        skipHtml: true,
      },
      sanitizedContent
    )
  )
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if a string contains potentially dangerous HTML.
 * Useful for validation before processing user input.
 *
 * @param html - The HTML string to check
 * @returns True if the string contains potentially dangerous content
 *
 * @example
 * ```typescript
 * isDangerousHtml('<p>Safe</p>') // false
 * isDangerousHtml('<script>alert(1)</script>') // true
 * isDangerousHtml('<img onerror="evil()">') // true
 * ```
 */
export function isDangerousHtml(html: string): boolean {
  if (!html || typeof html !== 'string') {
    return false
  }

  // Check for script tags
  if (/<script\b/i.test(html)) return true

  // Check for event handlers
  if (/\bon\w+\s*=/i.test(html)) return true

  // Check for javascript: protocol
  if (/javascript:/i.test(html)) return true

  // Check for data: protocol in attributes
  if (/data:\s*text\/html/i.test(html)) return true

  // Check for iframe/object/embed
  if (/<(iframe|object|embed)\b/i.test(html)) return true

  return false
}

/**
 * Strips all HTML tags from a string, leaving only text content.
 * Useful when you need plain text from potentially formatted content.
 *
 * @param html - The HTML string to strip
 * @returns Plain text with all HTML tags removed
 *
 * @example
 * ```typescript
 * stripHtml('<p>Hello <strong>World</strong></p>')
 * // Result: 'Hello World'
 * ```
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  // Use DOMPurify with no allowed tags to strip all HTML
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
}

export default SafeMarkdown
