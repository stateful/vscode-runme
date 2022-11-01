import { test, expect, vi } from 'vitest'

import { Kernel } from '../../src/extension/kernel'
import { resetEnv } from '../../src/extension/utils'
import executors from '../../src/extension/executors'


vi.mock('vscode')
vi.mock('../../src/extension/utils', () => ({
  resetEnv: vi.fn(),
  getKey: vi.fn().mockReturnValue('foobar')
}))
vi.mock('../../src/extension/executors/index.js', () => ({
  default: { foobar: vi.fn() }
}))


test('dispose', () => {
  const k = new Kernel({} as any)
  k.dispose()
  expect(resetEnv).toBeCalledTimes(1)
})

test('_executeAll', async () => {
  const k = new Kernel({} as any)
  k['_doExecuteCell'] = vi.fn()
  await k['_executeAll']([1, 2, 3] as any)
  expect(k['_doExecuteCell']).toBeCalledTimes(3)
})

test('_doExecuteCell', async () => {
  const k = new Kernel({} as any)
  await k['_doExecuteCell']({ document: {} } as any)
  // @ts-expect-error mocked out
  expect(executors.foobar).toBeCalledTimes(1)
})
