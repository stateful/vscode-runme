import path from 'node:path'

import { beforeEach, expect, test, vi, suite } from 'vitest'
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
  ExtensionContext,
} from 'vscode'

import {
  toggleTerminal,
  copyCellToClipboard,
  runCLICommand,
  openAsRunmeNotebook,
  openSplitViewAsMarkdownText,
  stopBackgroundTask,
  createNewRunmeNotebook,
  welcome,
  tryIt,
  openFileInRunme,
  addToRecommendedExtensions,
} from '../../../src/extension/commands'
import {
  getTerminalByCell,
  getAnnotations,
  openFileAsRunmeNotebook,
} from '../../../src/extension/utils'
import {
  getActionsOpenViewInEditor,
  getBinaryPath,
  getCLIUseIntegratedRunme,
  isNotebookTerminalEnabledForCell,
} from '../../../src/utils/configuration'
import { RecommendExtensionMessage } from '../../../src/extension/messaging'

vi.mock('vscode', () => import(path.join(process.cwd(), '__mocks__', 'vscode')))
vi.mock('vscode-telemetry')
vi.mock('../../../src/extension/utils', () => ({
  getAnnotations: vi.fn(() => ({})),
  getTerminalByCell: vi.fn(),
  replaceOutput: vi.fn(),
  openFileAsRunmeNotebook: vi.fn(),
}))
vi.mock('../../../src/utils/configuration', () => ({
  getActionsOpenViewInEditor: vi.fn(),
  getBinaryPath: vi.fn(),
  isNotebookTerminalEnabledForCell: vi.fn(),
  getCLIUseIntegratedRunme: vi.fn().mockReturnValue(false),
  OpenViewInEditorAction: { enum: { toggle: 'toggle', split: 'split' } },
}))
vi.mock('../../../src/extension/provider/cli', () => ({
  CliProvider: {
    isCliInstalled: vi.fn(),
  },
}))

vi.mock('../../../src/extension/server/runmeServer.ts', () => ({
  default: class {},
}))

vi.mock('../../../src/extension/runner', () => ({
  GrpcRunnerEnvironment: class {},
}))

vi.mock('../../../src/extension/grpc/runnerTypes', () => ({}))

beforeEach(() => {
  vi.mocked(window.showWarningMessage).mockClear()
  vi.mocked(window.showInformationMessage).mockClear()
  vi.mocked(getAnnotations).mockClear()
  vi.mocked(isNotebookTerminalEnabledForCell).mockReset()
  vi.mocked(getTerminalByCell).mockReset()
})

test('openTerminal without notebook terminal', () => {
  const func = toggleTerminal({} as any, false)

  vi.mocked(isNotebookTerminalEnabledForCell).mockReturnValueOnce(false)
  vi.mocked(getAnnotations).mockReturnValueOnce({ interactive: true } as any)
  expect(func({} as any)).resolves.toBe(undefined)
  expect(window.showWarningMessage).toBeCalledTimes(1)

  vi.mocked(isNotebookTerminalEnabledForCell).mockReturnValueOnce(false)
  vi.mocked(getAnnotations).mockReturnValueOnce({ interactive: true } as any)
  vi.mocked(getTerminalByCell).mockReturnValue({ show: vi.fn().mockReturnValue('showed') } as any)
  expect(func({} as any)).resolves.toBe('showed')
})

test('openTerminal with notebook terminal', async () => {
  vi.mocked(isNotebookTerminalEnabledForCell).mockReset()

  const outputs = {
    toggleTerminal: vi.fn(),
    showTerminal: vi.fn(),
  }

  const kernel = {
    getCellOutputs: vi.fn().mockReturnValue(outputs),
  }
  const func = toggleTerminal(kernel as any, true)

  vi.mocked(getTerminalByCell).mockReturnValueOnce({ show: () => {} } as any)
  vi.mocked(isNotebookTerminalEnabledForCell).mockReturnValueOnce(true)

  await func({} as any)
  expect(outputs.toggleTerminal).toBeCalledTimes(1)
  expect(isNotebookTerminalEnabledForCell).toBeCalledTimes(1)
})

test('copyCellToClipboard', () => {
  const cell: any = { document: { getText: vi.fn().mockReturnValue('foobar') } }
  copyCellToClipboard(cell)
  expect(env.clipboard.writeText).toBeCalledWith('foobar')
  expect(window.showInformationMessage).toBeCalledTimes(1)
})

suite('runCliCommand', () => {
  beforeEach(() => {
    vi.mocked(getBinaryPath).mockClear()
    vi.mocked(window.showInformationMessage).mockClear()
    vi.mocked(getAnnotations).mockClear()
    vi.mocked(terminal.sendText).mockClear()
    vi.mocked(getCLIUseIntegratedRunme).mockClear()
  })

  test('runs command when not dirty, using index', async () => {
    const cell: any = {
      metadata: { name: 'foobar' },
      document: { uri: { fsPath: '/foo/bar/README.md' } },
      kind: 1,
    }

    cell.notebook = {
      getCells: () => [cell],
      isDirty: false,
    }

    await runCLICommand({} as any, false, {} as any, {} as any)(cell)
    expect(vi.mocked((terminal as any).sendText)).toHaveBeenCalledWith(
      'runme run --chdir="/foo/bar" --filename="README.md" --index=0',
    )
  })

  test('uses integrated runme if config set', async () => {
    const cell: any = {
      metadata: { name: 'foobar' },
      document: { uri: { fsPath: '/foo/bar/README.md' } },
      kind: 1,
    }

    cell.notebook = {
      getCells: () => [cell],
      isDirty: false,
    }

    vi.mocked(getBinaryPath).mockReturnValueOnce(Uri.file('/bin/runme'))
    vi.mocked(getCLIUseIntegratedRunme).mockReturnValueOnce(true)

    await runCLICommand({} as any, false, {} as any, {} as any)(cell)
    expect(vi.mocked((terminal as any).sendText)).toHaveBeenCalledWith(
      '/bin/runme run --chdir="/foo/bar" --filename="README.md" --index=0',
    )
  })

  test('prompts user when dirty and fails if cancelled or closed', async () => {
    const cell: any = {
      metadata: { name: 'foobar' },
      document: { uri: { fsPath: '/foo/bar/README.md' } },
      kind: 1,
    }

    cell.notebook = {
      getCells: () => [cell],
      isDirty: true,
      save: vi.fn(),
    }

    // Cancelled
    vi.mocked(window.showInformationMessage).mockResolvedValueOnce('Cancel' as any)
    await runCLICommand({} as any, false, {} as any, {} as any)(cell)
    expect(vi.mocked(terminal.sendText)).not.toHaveBeenCalled()

    vi.mocked(terminal.sendText).mockClear()

    // Closed
    vi.mocked(window.showInformationMessage).mockResolvedValueOnce(undefined as any)
    await runCLICommand({} as any, false, {} as any, {} as any)(cell)

    expect(vi.mocked(terminal.sendText)).not.toHaveBeenCalled()

    vi.mocked(terminal.sendText).mockClear()

    // Saved
    vi.mocked(window.showInformationMessage).mockResolvedValueOnce('Save' as any)
    await runCLICommand({} as any, false, {} as any, {} as any)(cell)

    expect(vi.mocked(terminal.sendText)).toHaveBeenCalled()
    expect(cell.notebook.save).toHaveBeenCalledOnce()
  })
})

test('open markdown as Runme notebook split', (file: NotebookDocument) => {
  vi.mocked(getActionsOpenViewInEditor).mockReturnValue('split' as const)
  openAsRunmeNotebook(file)
  expect(window.showNotebookDocument).toBeCalledWith(file, { viewColumn: undefined })
})

test('open Runme notebook in text editor split', (file: TextDocument) => {
  vi.mocked(getActionsOpenViewInEditor).mockReturnValue('split' as const)
  openSplitViewAsMarkdownText(file)
  expect(window.showTextDocument).toBeCalledWith(file, { viewColumn: ViewColumn.Beside })
})

test('open markdown as Runme notebook toggle', (file: NotebookDocument) => {
  vi.mocked(getActionsOpenViewInEditor).mockReturnValue('toggle' as const)
  openAsRunmeNotebook(file)
  expect(commands.executeCommand).toBeCalledWith('workbench.action.toggleEditorType')
})

test('open Runme notebook in text editor toggle', (file: TextDocument) => {
  vi.mocked(getActionsOpenViewInEditor).mockReturnValue('toggle' as const)
  openSplitViewAsMarkdownText(file)
  expect(commands.executeCommand).toBeCalledWith('workbench.action.toggleEditorType')
})

test('stopBackgroundTask if terminal exists', () => {
  vi.mocked(getTerminalByCell).mockReturnValue({ dispose: vi.fn() } as any)
  stopBackgroundTask({} as any)
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

test('welcome command', async () => {
  await welcome()
  expect(commands.executeCommand).toBeCalledWith(
    'workbench.action.openWalkthrough',
    'stateful.runme#runme.welcome',
    false,
  )
})

test('tryIt command', async () => {
  await tryIt({ globalStorageUri: { fsPath: '/foo/bar' } } as any)
  expect(vi.mocked(workspace.fs.createDirectory).mock.calls[0][0].path.startsWith('/foo/bar')).toBe(
    true,
  )
  expect(
    vi.mocked(workspace.fs.writeFile).mock.calls[0][0].path.endsWith('Welcome to Runme.md'),
  ).toBe(true)
  expect(commands.executeCommand).toBeCalledWith('vscode.openWith', expect.any(Object), 'runme')
})

test('tryIt command in failure case', async () => {
  vi.mocked(workspace.fs.createDirectory).mockRejectedValue('ups')
  await tryIt({ extensionPath: '/foo/bar' } as any)
  expect(commands.executeCommand).toBeCalledWith('vscode.openWith', expect.any(Object), 'runme')
})

beforeEach(() => {
  vi.mocked(openFileAsRunmeNotebook).mockClear()
})

test('openFileInRunme command', async () => {
  vi.mocked(openFileAsRunmeNotebook).mockClear()

  const uri = {} as any
  await openFileInRunme(uri)

  expect(openFileAsRunmeNotebook).toHaveBeenCalledOnce()
  expect(openFileAsRunmeNotebook).toBeCalledWith(uri, 0, [uri])
})

test('openFileInRunme command multiselect', async () => {
  vi.mocked(openFileAsRunmeNotebook).mockClear()

  const uri = {} as any
  const uri2 = {} as any
  await openFileInRunme(uri, [uri, uri2])

  expect(openFileAsRunmeNotebook).toBeCalledTimes(2)
  expect(openFileAsRunmeNotebook).toBeCalledWith(uri, 0, [uri, uri2])
  expect(openFileAsRunmeNotebook).toBeCalledWith(uri2, 1, [uri, uri2])
})

test('addToRecommendedExtensions command', async () => {
  const recommendExtensionSpy = vi.spyOn(RecommendExtensionMessage.prototype, 'display')
  const contextMock: ExtensionContext = {
    globalState: {
      get: vi.fn().mockReturnValue(undefined),
      update: vi.fn().mockResolvedValue({}),
    },
  } as any
  await addToRecommendedExtensions(contextMock)
  expect(recommendExtensionSpy).toHaveBeenCalledOnce()
})
