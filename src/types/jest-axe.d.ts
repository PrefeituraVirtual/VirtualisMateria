declare module 'jest-axe' {
  export const axe: (html: Element | Document | string, options?: Record<string, unknown>) => Promise<any>
  export const toHaveNoViolations: (results: any) => { pass: boolean; message: () => string }
}

declare module 'vitest' {
  export const describe: (...args: any[]) => any
  export const it: (...args: any[]) => any
  export const expect: any
  export const vi: any
  export const beforeAll: (...args: any[]) => any
  export const afterAll: (...args: any[]) => any
  export const afterEach: (...args: any[]) => any
  export type Mock<T extends (...args: any[]) => any = (...args: any[]) => any> = T & {
    mock: {
      calls: any[]
    }
    mockClear: () => void
  }

  interface Assertion<T = any> {
    toHaveNoViolations(): T
  }

  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void
  }
}
