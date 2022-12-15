import path from 'node:path'

import { beforeEach, expect, test, vi } from 'vitest'
import {
  window,
  env,
  workspace,
  commands,
  // @ts-expect-error mock feature
  terminal,
  NotebookDocument,
  TextDocument,
  ViewColumn,
  NotebookCellData
} from 'vscode'

import {
  openTerminal,
  copyCellToClipboard,
  runCLICommand,
  openAsRunmeNotebook,
  openSplitViewAsMarkdownText,
  stopBackgroundTask,
  createNewRunmeNotebook
} from '../../../src/extension/commands'
import { getTerminalByCell, getMetadata } from '../../../src/extension/utils'
import { CliProvider } from '../../../src/extension/provider/cli'

vi.mock('vscode', () => import(path.join(process.cwd(), '__mocks__', 'vscode')))
vi.mock('../../../src/extension/utils', () => ({
  getMetadata: vi.fn(),
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
  vi.mocked(getMetadata).mockClear()
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
    metadata: { 'runme.dev/name': 'foobar' },
    document: { uri: { fsPath: '/foo/bar' }}
  }
  vi.mocked(CliProvider.isCliInstalled).mockResolvedValue(true)
  vi.mocked(getMetadata).mockReturnValue(cell.metadata)
  await runCLICommand(cell)
  expect(window.createTerminal).toBeCalledWith('CLI: foobar')
  expect(terminal.show).toBeCalledTimes(1)
  expect(terminal.sendText).toBeCalledWith('runme run foobar --chdir="/foo"')
})

test('open markdown as Runme notebook', (file: NotebookDocument) => {
  openAsRunmeNotebook(file)
  expect(window.showNotebookDocument).toBeCalledWith(file, { viewColumn: ViewColumn.Beside})
})

test('open Runme notebook in text editor', (file: TextDocument) => {
  openSplitViewAsMarkdownText(file)
  expect(window.showTextDocument).toBeCalledWith(file, {viewColumn: ViewColumn.Beside})
})

test('stopBackgroundTask if terminal exists', () => {
  vi.mocked(getTerminalByCell).mockReturnValue({ dispose: vi.fn() } as any)
  stopBackgroundTask({} as any)
  expect(window.showInformationMessage).toBeCalledTimes(1)
})

test('stopBackgroundTask if terminal does not exist', () => {
  vi.mocked(getTerminalByCell).mockReturnValue(undefined)
  stopBackgroundTask({} as any)
  expect(window.showWarningMessage).toBeCalledTimes(1)
})

test('createNewRunmeNotebook', async () => {
  await createNewRunmeNotebook()
  expect(workspace.openNotebookDocument).toBeCalledWith('runme', expect.any(Object))
  expect(NotebookCellData).toBeCalledTimes(3)
  expect(commands.executeCommand).toBeCalledWith('vscode.openWith', expect.any(String), 'runme')
})
