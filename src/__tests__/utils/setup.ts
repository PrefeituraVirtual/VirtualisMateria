/**
 * Vitest Global Setup
 *
 * This file runs before all tests and sets up the testing environment.
 * It handles mocking for browser APIs and provides global test utilities.
 *
 * Note: This setup works for both node and jsdom environments.
 * Browser-specific mocks are only applied when window is available.
 */

import { vi, beforeAll, afterEach, afterAll } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Check if we're in a browser-like environment
const isBrowserEnv = typeof window !== 'undefined'

// Mock browser APIs only when in jsdom environment
beforeAll(() => {
  if (!isBrowserEnv) return

  // Mock window.matchMedia for tests that use responsive hooks
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  // Mock scrollTo
  window.scrollTo = vi.fn() as typeof window.scrollTo

  // Mock clipboard API
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue(''),
    },
  })
})

// Mock ResizeObserver globally (works in both environments)
beforeAll(() => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })) as unknown as typeof ResizeObserver

  // Mock IntersectionObserver for lazy loading tests
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
  })) as unknown as typeof IntersectionObserver
})

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
})

// Global cleanup
afterAll(() => {
  vi.restoreAllMocks()
})

// Suppress console errors in tests (optional, uncomment if needed)
// beforeAll(() => {
//   vi.spyOn(console, 'error').mockImplementation(() => {})
// })
