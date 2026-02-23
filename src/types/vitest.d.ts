/**
 * Vitest Type Augmentation
 *
 * This file ensures that TypeScript recognizes all Vitest exports
 * when using `globals: true` in vitest.config.ts.
 *
 * The issue is that TypeScript 5.9.3 with bundler module resolution
 * doesn't properly resolve re-exports from @vitest/runner through vitest.
 */

// Basic test function type
type TestFn = (name: string, fn: () => void | Promise<void>, timeout?: number) => void;

// Extended test function types with .each and .skip
interface EachFunction {
  <T extends readonly unknown[]>(
    cases: readonly T[]
  ): (name: string, fn: (...args: T) => void | Promise<void>, timeout?: number) => void;
}

interface ExtendedTestFunction extends TestFn {
  each: EachFunction;
  skip: TestFn;
  only: TestFn;
  todo: (name: string) => void;
  concurrent: TestFn;
}

interface ExtendedSuiteFunction {
  (name: string, fn: () => void): void;
  skip: (name: string, fn: () => void) => void;
  only: (name: string, fn: () => void) => void;
  concurrent: (name: string, fn: () => void) => void;
  todo: (name: string) => void;
}

// Hook types
type BeforeAllFn = (fn: () => void | Promise<void>, timeout?: number) => void;
type AfterAllFn = (fn: () => void | Promise<void>, timeout?: number) => void;
type BeforeEachFn = (fn: () => void | Promise<void>, timeout?: number) => void;
type AfterEachFn = (fn: () => void | Promise<void>, timeout?: number) => void;

declare module 'vitest' {
  export const beforeEach: BeforeEachFn;
  export const afterEach: AfterEachFn;
  export const beforeAll: BeforeAllFn;
  export const afterAll: AfterAllFn;
  export const describe: ExtendedSuiteFunction;
  export const it: ExtendedTestFunction;
  export const test: ExtendedTestFunction;
}

export {};
