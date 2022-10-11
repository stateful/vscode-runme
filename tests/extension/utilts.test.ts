import vscode from 'vscode'
import { expect, vi, test, beforeAll, afterAll } from 'vitest'

import { getExecutionProperty, getTerminalByCell, populateEnvVar, resetEnv, getKey } from '../../src/extension/utils'
import { ENV_STORE, DEFAULT_ENV } from '../../src/extension/constants'

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

const PATH = process.env.PATH
beforeAll(() => {
  DEFAULT_ENV.PATH = '/usr/bin'
  ENV_STORE.delete('PATH')
})
afterAll(() => { process.env.PATH = PATH })

test('isInteractive', () => {
  // when set to false in configutaration
  vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({ get: vi.fn().mockReturnValue(false) } as any)
  expect(getExecutionProperty('interactive', { metadata: {} } as any)).toBe(false)
  expect(getExecutionProperty('interactive', { metadata: { attributes: {} } } as any)).toBe(false)
  expect(getExecutionProperty('interactive', { metadata: { attributes: { interactive: 'true' } } } as any)).toBe(true)

  vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({ get: vi.fn().mockReturnValue(true) } as any)
  expect(getExecutionProperty('interactive', { metadata: {} } as any)).toBe(true)
  expect(getExecutionProperty('interactive', { metadata: { attributes: {} } } as any)).toBe(true)
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

test('resetEnv', () => {
  ENV_STORE.set('foo', 'bar')
  expect(ENV_STORE).toMatchSnapshot()
  resetEnv()
  expect(ENV_STORE).toMatchSnapshot()
})

test('getKey', () => {
  expect(getKey({
    getText: vi.fn().mockReturnValue('foobar'),
    languageId: 'barfoo'
  } as any)).toBe('barfoo')
  expect(getKey({
    getText: vi.fn().mockReturnValue('deployctl deploy foobar'),
    languageId: 'something else'
  } as any)).toBe('deno')
})
