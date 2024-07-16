import { test } from 'vitest'
import { vi } from 'vitest'

import getLogger from '../../../src/extension/logger'
const log = getLogger()

vi.mock('vscode', async () => {
  const vscode = await import('../../../__mocks__/vscode')
  return {
    default: vscode,
    ...vscode,
  }
})

// Create a manual test for working with the foyle AI service
test.skipIf(process.env.RUN_MANUAL_TESTS !== 'true')('manual foyle streaming RPC test', () => {
  log.info('Starting manual test for foyle streaming RPC')
})
