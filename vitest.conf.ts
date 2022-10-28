/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    /**
     * not to ESM ported packages
     */
    exclude: [
      'dist', '.idea', '.git', '.cache',
      '**/node_modules/**', './examples/**'
    ],
    coverage: {
      enabled: false,
      exclude: ['**/build/**', '**/__fixtures__/**', '**/*.test.ts'],
      lines: 100,
      functions: 100,
      branches: 100,
      statements: 100
    }
  }
})
