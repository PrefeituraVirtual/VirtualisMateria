import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    // Use 'node' for non-React tests, 'jsdom' for React component tests
    // Tests can override with // @vitest-environment jsdom
    environment: 'node',
    environmentMatchGlobs: [
      // React component tests use jsdom
      ['src/components/**/*.{test,spec}.{ts,tsx}', 'jsdom'],
      ['src/__tests__/components/**/*.{test,spec}.{ts,tsx}', 'jsdom'],
    ],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', '.next', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/*.d.ts',
        'src/__tests__/**',
      ],
    },
    // Setup files for testing utilities
    setupFiles: ['./src/__tests__/utils/setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
