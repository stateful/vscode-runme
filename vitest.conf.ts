/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: [
      'dist', '.idea', '.git', '.cache',
      '**/node_modules/**', 'examples/**'
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
