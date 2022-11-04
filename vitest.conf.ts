/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    /**
     * not to ESM ported packages
     */
    exclude: [
      'dist', '.idea', '.git', '.cache',
      '**/node_modules/**', 'examples'
    ],
    coverage: {
      enabled: true,
      exclude: ['**/build/**', '**/__fixtures__/**', '**/*.test.ts'],
      statements: 42,
      branches: 91,
      functions: 35,
      lines: 42
    }
  }
})
