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
      '**/node_modules/**'
    ],
    coverage: {
      enabled: true,
      exclude: ['**/build/**', '**/__fixtures__/**', '**/*.test.ts'],
      statements: 38,
      branches: 90,
      functions: 33,
      lines: 38
    }
  }
})
