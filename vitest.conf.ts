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
      statements: 43.3,
      branches: 89.5,
      functions: 32.6,
      lines: 43.3
    }
  }
})
