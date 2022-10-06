import vscode from 'vscode'
import { expect, vi, test } from 'vitest'

import { isInteractiveTask, getTerminalByCell, populateEnvVar } from '../../src/extension/utils'

vi.mock('vscode', () => ({
  default: {
    window: {
      terminals: [
        { creationOptions: { env: {} } },
        { creationOptions: { env: { RUNME_ID: 'foobar:123' } } }
      ]
    },
    workspace: {
      getConfiguration: vi.fn()
    }
  }
}))

test('isInteractive', () => {
  // when set to false in configutaration
  vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({ get: vi.fn().mockReturnValue(false) } as any)
  expect(isInteractiveTask({ metadata: {} } as any)).toBe(false)
  expect(isInteractiveTask({ metadata: { attributes: {} } } as any)).toBe(false)
  expect(isInteractiveTask({ metadata: { attributes: { interactive: 'true' } } } as any)).toBe(true)

  vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({ get: vi.fn().mockReturnValue(true) } as any)
  expect(isInteractiveTask({ metadata: {} } as any)).toBe(true)
  expect(isInteractiveTask({ metadata: { attributes: {} } } as any)).toBe(true)
})

test('getTerminalByCell', () => {
  expect(getTerminalByCell({ document: { fileName: 'foo' }, index: 42} as any))
    .toBe(undefined)
  expect(getTerminalByCell({ document: { fileName: 'foobar' }, index: 123} as any))
    .not.toBe(undefined)
})

test('populateEnvVar', () => {
  expect(populateEnvVar(
    'export PATH="/foo/$BAR/$LOO:$PATH:/$FOO"',
    { PATH: '/usr/bin', FOO: 'foo', BAR: 'bar' }
  )).toBe('export PATH="/foo/bar/:/usr/bin:/foo"')
})
