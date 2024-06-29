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
      reporter: ['lcov'],
      enabled: true,
      include: [
        'src/**'
      ],
      exclude: [
        '**/build/**',
        '**/__fixtures__/**',
        '**/*.test.ts',
        '**/__mocks__/**',
        '**/.wdio-vscode-service/**',
        '**/node_modules/**',
        '**/__generated__/**',
        '**/__generated-platform__/**',
        // ignore until we bring up coverage
        'src/client',
        // vendored code
        'src/utils/deno',
        'src/extension/wasm',
      ],
      thresholds: {
        statements: 43,
        // Temporary sert to 70
        branches: 70,
        functions: 32,
        lines: 43,
      }
    }
  }
})
