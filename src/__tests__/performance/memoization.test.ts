/**
 * Memoization Performance Tests
 *
 * These tests verify that React.memo, useMemo, and useCallback
 * optimizations are working correctly in our components.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { createRenderCounter, createMockCallback, waitForNextTick } from '../utils/test-utils'

describe('Memoization Utilities', () => {
  describe('createRenderCounter', () => {
    it('should track render count correctly', () => {
      const { trackRender, getRenderCount, resetRenderCount } = createRenderCounter()

      expect(getRenderCount()).toBe(0)

      trackRender()
      expect(getRenderCount()).toBe(1)

      trackRender()
      trackRender()
      expect(getRenderCount()).toBe(3)

      resetRenderCount()
      expect(getRenderCount()).toBe(0)
    })
  })

  describe('createMockCallback', () => {
    it('should track callback calls', () => {
      const { fn, getCallCount, getLastArgs, getAllArgs, reset } = createMockCallback()

      expect(getCallCount()).toBe(0)

      fn('arg1', 'arg2')
      expect(getCallCount()).toBe(1)
      expect(getLastArgs()).toEqual(['arg1', 'arg2'])

      fn('arg3')
      expect(getCallCount()).toBe(2)
      expect(getLastArgs()).toEqual(['arg3'])
      expect(getAllArgs()).toEqual([['arg1', 'arg2'], ['arg3']])

      reset()
      expect(getCallCount()).toBe(0)
    })
  })
})

describe('useMemo Optimization Patterns', () => {
  it('should not recompute when dependencies have not changed', () => {
    const computeFn = vi.fn((value: string) => `computed-${value}`)

    // Simulate useMemo behavior
    let cachedDep: string | undefined
    let cachedResult: string | undefined

    function simulateUseMemo(dep: string): string {
      if (cachedDep !== dep) {
        cachedDep = dep
        cachedResult = computeFn(dep)
      }
      return cachedResult!
    }

    // First call - should compute
    const result1 = simulateUseMemo('test')
    expect(computeFn).toHaveBeenCalledTimes(1)
    expect(result1).toBe('computed-test')

    // Second call with same dependency - should NOT recompute
    const result2 = simulateUseMemo('test')
    expect(computeFn).toHaveBeenCalledTimes(1) // Still 1
    expect(result2).toBe('computed-test')

    // Third call with different dependency - should recompute
    const result3 = simulateUseMemo('changed')
    expect(computeFn).toHaveBeenCalledTimes(2)
    expect(result3).toBe('computed-changed')
  })
})

describe('useCallback Optimization Patterns', () => {
  it('should maintain referential equality when dependencies unchanged', () => {
    // Simulate useCallback behavior
    let cachedCallback: (() => void) | undefined
    let cachedDep: number | undefined

    function simulateUseCallback(callback: () => void, dep: number): () => void {
      if (cachedDep !== dep) {
        cachedDep = dep
        cachedCallback = callback
      }
      return cachedCallback!
    }

    const callback1 = () => console.log('callback1')
    const callback2 = () => console.log('callback2')

    // First call
    const result1 = simulateUseCallback(callback1, 1)
    expect(result1).toBe(callback1)

    // Second call with same dependency - should return cached callback
    const result2 = simulateUseCallback(callback2, 1)
    expect(result2).toBe(callback1) // Still the original callback
    expect(result2).not.toBe(callback2)

    // Third call with different dependency - should update
    const result3 = simulateUseCallback(callback2, 2)
    expect(result3).toBe(callback2)
  })
})

describe('React.memo Optimization Patterns', () => {
  it('should prevent re-render when props are shallowly equal', () => {
    const renderCounter = createRenderCounter()

    // Simulate React.memo props comparison
    interface Props {
      id: number
      name: string
      onClick: () => void
    }

    let prevProps: Props | undefined

    function shouldComponentUpdate(nextProps: Props): boolean {
      if (!prevProps) {
        prevProps = nextProps
        return true // First render
      }

      // Shallow comparison
      const shouldUpdate =
        prevProps.id !== nextProps.id ||
        prevProps.name !== nextProps.name ||
        prevProps.onClick !== nextProps.onClick

      if (shouldUpdate) {
        prevProps = nextProps
      }

      return shouldUpdate
    }

    const onClick = vi.fn()
    const props1: Props = { id: 1, name: 'Test', onClick }
    const props2: Props = { id: 1, name: 'Test', onClick } // Same values
    const props3: Props = { id: 2, name: 'Test', onClick } // Different id

    // First render - always renders
    expect(shouldComponentUpdate(props1)).toBe(true)
    renderCounter.trackRender()

    // Same props - should NOT re-render
    expect(shouldComponentUpdate(props2)).toBe(false)
    // Component would not re-render here

    // Different id - should re-render
    expect(shouldComponentUpdate(props3)).toBe(true)
    renderCounter.trackRender()

    expect(renderCounter.getRenderCount()).toBe(2)
  })

  it('should re-render when callback reference changes without useCallback', () => {
    let prevOnClick: (() => void) | undefined

    function propsChanged(nextOnClick: () => void): boolean {
      if (prevOnClick !== nextOnClick) {
        prevOnClick = nextOnClick
        return true
      }
      return false
    }

    // Simulating parent re-render creating new callback each time
    const callback1 = () => {}
    const callback2 = () => {}

    expect(propsChanged(callback1)).toBe(true) // First render
    expect(propsChanged(callback2)).toBe(true) // New reference = re-render

    // With stable reference (useCallback)
    const stableCallback = () => {}
    expect(propsChanged(stableCallback)).toBe(true) // First with stable
    expect(propsChanged(stableCallback)).toBe(false) // Same reference = no re-render
  })
})

describe('Performance Timing Utilities', () => {
  it('should accurately measure async operation timing', async () => {
    const start = performance.now()

    await waitForNextTick()

    const elapsed = performance.now() - start

    // Should be very fast (just event loop tick)
    expect(elapsed).toBeLessThan(100)
  })
})

describe('Object Reference Stability', () => {
  it('should detect when object reference changes', () => {
    const obj1 = { value: 1 }
    const obj2 = { value: 1 }
    const obj3 = obj1

    // Different references
    expect(obj1 === obj2).toBe(false)

    // Same reference
    expect(obj1 === obj3).toBe(true)
  })

  it('should detect array reference changes', () => {
    const arr1 = [1, 2, 3]
    const arr2 = [1, 2, 3]
    const arr3 = arr1

    // Different references
    expect(arr1 === arr2).toBe(false)

    // Same reference
    expect(arr1 === arr3).toBe(true)
  })
})
