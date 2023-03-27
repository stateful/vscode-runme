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
  NotebookCellData,
  Uri,
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
import { getTerminalByCell, getAnnotations } from '../../../src/extension/utils'
import { getBinaryPath } from '../../../src/utils/configuration'

vi.mock('vscode', () => import(path.join(process.cwd(), '__mocks__', 'vscode')))
vi.mock('vscode-telemetry')
vi.mock('../../../src/extension/utils', () => ({
  getAnnotations: vi.fn(),
  getTerminalByCell: vi.fn()
}))
vi.mock('../../../src/utils/configuration', () => ({
  getBinaryPath: vi.fn(),
}))
vi.mock('../../../src/extension/provider/cli', () => ({
  CliProvider: {
    isCliInstalled: vi.fn()
  }
}))

vi.mock('../../../src/extension/server/runmeServer.ts', () => ({
  default: class { }
}))

vi.mock('../../../src/extension/runner', () => ({
  GrpcRunnerEnvironment: class { }
}))

beforeEach(() => {
  vi.mocked(window.showWarningMessage).mockClear()
  vi.mocked(window.showInformationMessage).mockClear()
  vi.mocked(getAnnotations).mockClear()
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

test('runCLICommand', async () => {
  const cell: any = {
    metadata: { name: 'foobar' },
    document: { uri: { fsPath: '/foo/bar/README.md' }}
  }
  vi.mocked(getAnnotations).mockReturnValueOnce({
    name: 'foo-bar',
  } as any)
  vi.mocked(getBinaryPath).mockReturnValueOnce(Uri.file('/bin/runme'))
  vi.mocked(window.showInformationMessage).mockResolvedValueOnce(false as any)

  await runCLICommand({} as any, false, {} as any, {} as any)(cell)
  expect(vi.mocked((terminal as any).sendText)).toHaveBeenCalledWith(
    '/bin/runme run foo-bar --chdir="/foo/bar" --filename="README.md"'
  )
})

test('open markdown as Runme notebook', (file: NotebookDocument) => {
  openAsRunmeNotebook(file)
  expect(window.showNotebookDocument).toBeCalledWith(file, { viewColumn: undefined})
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
