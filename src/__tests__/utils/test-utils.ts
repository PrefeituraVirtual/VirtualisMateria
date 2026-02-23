/**
 * Test Utilities for React Component Testing
 *
 * This file provides utilities for testing React components,
 * including render count tracking for memoization verification.
 */

import { vi } from 'vitest'
import type { Mock } from 'vitest'

/**
 * Creates a render counter to track how many times a component renders.
 * Useful for verifying React.memo, useMemo, and useCallback optimizations.
 *
 * @example
 * ```typescript
 * const { getRenderCount, trackRender } = createRenderCounter()
 *
 * function TestComponent({ data }: Props) {
 *   trackRender()
 *   return <div>{data}</div>
 * }
 *
 * // After test interactions
 * expect(getRenderCount()).toBe(1) // Verify no unnecessary re-renders
 * ```
 */
export function createRenderCounter() {
  let renderCount = 0

  return {
    trackRender: () => {
      renderCount++
    },
    getRenderCount: () => renderCount,
    resetRenderCount: () => {
      renderCount = 0
    },
  }
}

/**
 * Creates a mock function that tracks call count and arguments.
 * Useful for testing callback optimizations.
 *
 * @example
 * ```typescript
 * const mockCallback = createMockCallback()
 *
 * // Pass to component
 * render(<Component onClick={mockCallback.fn} />)
 *
 * // Verify calls
 * expect(mockCallback.getCallCount()).toBe(1)
 * expect(mockCallback.getLastArgs()).toEqual(['arg1', 'arg2'])
 * ```
 */
export function createMockCallback<T extends (...args: unknown[]) => unknown>() {
  const fn = vi.fn() as Mock<T>

  return {
    fn,
    getCallCount: () => fn.mock.calls.length,
    getLastArgs: () => fn.mock.calls[fn.mock.calls.length - 1],
    getAllArgs: () => fn.mock.calls,
    reset: () => fn.mockClear(),
  }
}

/**
 * Waits for the next tick of the event loop.
 * Useful for testing async state updates.
 */
export function waitForNextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Waits for a specified number of milliseconds.
 * Useful for testing timeout-based behavior.
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Creates a mock for localStorage.
 *
 * @example
 * ```typescript
 * const storage = createMockStorage()
 * vi.stubGlobal('localStorage', storage)
 *
 * // Test code that uses localStorage
 * localStorage.setItem('key', 'value')
 * expect(storage.getItem('key')).toBe('value')
 * ```
 */
export function createMockStorage() {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  }
}

/**
 * Mock fetch response helper.
 *
 * @example
 * ```typescript
 * vi.stubGlobal('fetch', createMockFetch({ data: 'test' }))
 *
 * const response = await fetch('/api/test')
 * const data = await response.json()
 * expect(data).toEqual({ data: 'test' })
 * ```
 */
export function createMockFetch<T>(data: T, options?: { status?: number; ok?: boolean }) {
  return vi.fn().mockResolvedValue({
    ok: options?.ok ?? true,
    status: options?.status ?? 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
  })
}

/**
 * Creates a mock for performance.now() with controllable time.
 * Useful for testing time-based functionality.
 *
 * @example
 * ```typescript
 * const { now, advance } = createMockPerformance()
 * vi.stubGlobal('performance', { now })
 *
 * expect(now()).toBe(0)
 * advance(100)
 * expect(now()).toBe(100)
 * ```
 */
export function createMockPerformance() {
  let currentTime = 0

  return {
    now: vi.fn(() => currentTime),
    advance: (ms: number) => {
      currentTime += ms
    },
    reset: () => {
      currentTime = 0
    },
  }
}

/**
 * Type-safe wrapper for creating props with partial overrides.
 *
 * @example
 * ```typescript
 * interface ButtonProps {
 *   label: string
 *   onClick: () => void
 *   disabled?: boolean
 * }
 *
 * const defaultProps: ButtonProps = {
 *   label: 'Click me',
 *   onClick: vi.fn(),
 * }
 *
 * const props = createTestProps(defaultProps, { disabled: true })
 * // props = { label: 'Click me', onClick: vi.fn(), disabled: true }
 * ```
 */
export function createTestProps<T extends object>(
  defaults: T,
  overrides?: Partial<T>
): T {
  return { ...defaults, ...overrides }
}

/**
 * Generates unique test IDs to avoid collisions in parallel tests.
 */
export function generateTestId(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Assertion helper for checking if a value is within a range.
 * Useful for testing timing and performance values.
 */
export function expectWithinRange(
  actual: number,
  expected: number,
  tolerance: number
): void {
  const min = expected - tolerance
  const max = expected + tolerance

  if (actual < min || actual > max) {
    throw new Error(
      `Expected ${actual} to be within ${tolerance} of ${expected} (${min} - ${max})`
    )
  }
}

/**
 * Creates a deferred promise for controlling async flow in tests.
 *
 * @example
 * ```typescript
 * const deferred = createDeferred<string>()
 *
 * // Start async operation
 * const resultPromise = fetchData()
 *
 * // Control when promise resolves
 * deferred.resolve('test data')
 *
 * const result = await resultPromise
 * expect(result).toBe('test data')
 * ```
 */
export function createDeferred<T>() {
  let resolve: (value: T) => void
  let reject: (reason?: unknown) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  }
}
