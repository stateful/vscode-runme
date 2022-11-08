import { beforeEach, expect, test, vi } from 'vitest'
import {
  window, env,
  // @ts-expect-error mock feature
  terminal
} from 'vscode'

import { openTerminal, copyCellToClipboard, runCLICommand } from '../../../src/extension/commands'
import { getTerminalByCell } from '../../../src/extension/utils'
import { CliProvider } from '../../../src/extension/provider/cli'

vi.mock('vscode')
vi.mock('../../../src/extension/utils', () => ({
  getTerminalByCell: vi.fn()
}))
vi.mock('../../../src/extension/provider/cli', () => ({
  CliProvider: {
    isCliInstalled: vi.fn()
  }
}))

beforeEach(() => {
  vi.mocked(window.showWarningMessage).mockClear()
  vi.mocked(window.showInformationMessage).mockClear()
})

test('openTerminal', () => {
  expect(openTerminal({} as any)).toBe(undefined)
  expect(window.showWarningMessage).toBeCalledTimes(1)

  vi.mocked(getTerminalByCell).mockReturnValue({ show: vi.fn().mockReturnValue('showed') } as any)
  expect(openTerminal({} as any)).toBe('showed')
})

test('copyCellToClipboard', () => {
  const cell: any = { document: { getText: vi.fn().mockReturnValue('foobar') } }  
  copyCellToClipboard(cell)
  expect(env.clipboard.writeText).toBeCalledWith('foobar')
  expect(window.showInformationMessage).toBeCalledTimes(1)
})

test('runCLICommand if CLI is not installed', async () => {
  const cell: any = {}
  vi.mocked(window.showInformationMessage).mockResolvedValueOnce(false as any)
  await runCLICommand(cell)
  expect(env.openExternal).toBeCalledTimes(0)
  vi.mocked(window.showInformationMessage).mockResolvedValue(true as any)
  await runCLICommand(cell)
  expect(env.openExternal).toBeCalledTimes(1)
})

test('runCLICommand if CLI is installed', async () => {
  const cell: any = {
    metadata: { cliName: 'foobar' },
    document: { uri: { fsPath: '/foo/bar' }}
  }
  vi.mocked(CliProvider.isCliInstalled).mockResolvedValue(true)
  await runCLICommand(cell)
  expect(window.createTerminal).toBeCalledWith('CLI: foobar')
  expect(terminal.show).toBeCalledTimes(1)
  expect(terminal.sendText).toBeCalledWith('runme run foobar --chdir="/foo"')
})

// test('stopBackgroundTask', () => {

//   const cell: any = { 
//     document: { getText: vi.fn().mockReturnValue('foobar') }, 
//     executionSummary: { success: true}
//   }
//   // expect(stopBackgroundTask({} as any)).toBe(undefined)

//   stopBackgroundTask(cell)
//   expect(terminal.dispose).toBeCalledTimes(1)
//   expect(window.showInformationMessage).toBeCalledTimes(1)
// })
// test('stopBackgroundTask', () => {
//   expect(stopBackgroundTask({} as any)).toBe(undefined)
//   expect(window.showWarningMessage).toBeCalledTimes(1)
  
//   vi.mocked(getTerminalByCell).mockReturnValue({ dispose: vi.fn().mockReturnValue('disposed') } as any)
//   expect(stopBackgroundTask({} as any)).toBe('dispose')
//   expect(window.showInformationMessage).toBeCalledTimes(1)

//   // const cell: any = { 
//   //   document: { getText: vi.fn().mockReturnValue('foobar') }, 
//   //   executionSummary: { success: true}
//   // }
//   // // expect(stopBackgroundTask({} as any)).toBe(undefined)

//   // stopBackgroundTask(cell)
//   // expect(terminal.dispose).toBeCalledTimes(1)
//   // expect(window.showInformationMessage).toBeCalledTimes(1)
// })