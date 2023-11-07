import { test, expect, vi } from 'vitest'

import { isVercelDeployScript } from '../../../src/extension/executors/vercel.js'

vi.mock('vscode')
vi.mock('vscode-telemetry')
vi.mock('../../../src/extension/executors/task.js', () => ({
  bash: vi.fn(),
  sh: vi.fn(),
}))
vi.mock('../../../src/extension/executors/vercel/index.js', () => ({
  deploy: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}))
vi.mock('../../../src/extension/cell.js', () => ({
  NotebookCellOutputManager: vi.fn(),
  updateCellMetadata: vi.fn(),
}))

test('isVercelDeployScript', () => {
  expect(isVercelDeployScript('set -e -o pipefail; npm i -g vercel')).toBe(false)
  expect(isVercelDeployScript('set -e -o pipefail; vercel login')).toBe(false)
  expect(isVercelDeployScript('set -e -o pipefail; vercel')).toBe(true)
})
