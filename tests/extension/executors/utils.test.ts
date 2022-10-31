import url from 'node:url'

import { window } from 'vscode'
import { expect, vi, test, beforeEach } from 'vitest'

import { ENV_STORE } from '../../../src/extension/constants'
import { retrieveShellCommand } from '../../../src/extension/executors/utils'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

vi.mock('vscode', () => ({
  window: {
    showInputBox: vi.fn(),
    showErrorMessage: vi.fn()
  },
  workspace: {
    getConfiguration: vi.fn()
  }
}))

beforeEach(() => {
  vi.mocked(window.showInputBox).mockClear()
  vi.mocked(window.showErrorMessage).mockClear()
})

test('should support export without quotes', async () => {
  const exec: any = { cell: { document: {
    getText: vi.fn().mockReturnValue('export foo=bar'),
    uri: { fsPath: __dirname }
  }}}
  vi.mocked(window.showInputBox).mockResolvedValue('barValue')
  const cellText = await retrieveShellCommand(exec)
  expect(cellText).toBe('')
  expect(ENV_STORE.get('foo')).toBe('barValue')
  expect(vi.mocked(window.showInputBox).mock.calls[0][0]?.placeHolder).toBe('bar')
  expect(vi.mocked(window.showInputBox).mock.calls[0][0]?.value).toBe(undefined)
})

test('should populate value if quotes are used', async () => {
  const exec: any = { cell: { document: {
    getText: vi.fn().mockReturnValue('export foo="bar"'),
    uri: { fsPath: __dirname }
  }}}
  vi.mocked(window.showInputBox).mockResolvedValue('barValue')
  const cellText = await retrieveShellCommand(exec)
  expect(cellText).toBe('')
  expect(ENV_STORE.get('foo')).toBe('barValue')
  expect(vi.mocked(window.showInputBox).mock.calls[0][0]?.placeHolder).toBe('bar')
  expect(vi.mocked(window.showInputBox).mock.calls[0][0]?.value).toBe('bar')
})

test('can support single quotes', async () => {
  const exec: any = { cell: { document: {
    getText: vi.fn().mockReturnValue('export foo=\'bar\''),
    uri: { fsPath: __dirname }
  }}}
  vi.mocked(window.showInputBox).mockResolvedValue('barValue')
  const cellText = await retrieveShellCommand(exec)
  expect(cellText).toBe('')
  expect(ENV_STORE.get('foo')).toBe('barValue')
  expect(vi.mocked(window.showInputBox).mock.calls[0][0]?.placeHolder).toBe('bar')
  expect(vi.mocked(window.showInputBox).mock.calls[0][0]?.value).toBe('bar')
})

test('can handle new lines before and after', async () => {
  const exec: any = { cell: { document: {
    getText: vi.fn().mockReturnValue('\n\nexport foo=bar\n'),
    uri: { fsPath: __dirname }
  }}}
  const cellText = await retrieveShellCommand(exec)
  expect(cellText).toBe('\n\n\n')
})

test('can populate pre-existing envs', async () => {
  const exec: any = { cell: { document: {
    getText: vi.fn().mockReturnValue('export foo="foo$BARloo"'),
    uri: { fsPath: __dirname }
  }}}
  process.env.BAR = 'rab'
  vi.mocked(window.showInputBox).mockResolvedValue('foo$BAR')
  const cellText = await retrieveShellCommand(exec)
  expect(cellText).toBe('')
  expect(ENV_STORE.get('foo')).toBe('foorab')
})

test('can support expressions', async () => {
  const exec: any = { cell: { document: {
    getText: vi.fn().mockReturnValue('export foo=$(echo "foo$BAR")'),
    uri: { fsPath: __dirname }
  }}}
  process.env.BAR = 'bar'
  const cellText = await retrieveShellCommand(exec)
  expect(cellText).toBe('')
  expect(ENV_STORE.get('foo')).toBe('foobar\n')
})

test('returns undefined if expression fails', async () => {
  const exec: any = { cell: { document: {
    getText: vi.fn().mockReturnValue('export foo=$(FAIL)'),
    uri: { fsPath: __dirname }
  }}}
  expect(await retrieveShellCommand(exec)).toBeUndefined()
  expect(window.showErrorMessage).toBeCalledTimes(1)
})
