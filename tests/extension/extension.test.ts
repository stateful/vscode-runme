import { test, expect, vi } from 'vitest'
import { notebooks, workspace, commands, window } from 'vscode'

import { RunmeExtension } from '../../src/extension/extension'

vi.mock('vscode')
vi.mock('vscode-telemetry')

vi.mock('../../src/extension/grpc/client', () => ({
  ParserServiceClient: vi.fn(),
  RunnerServiceClient: vi.fn(),
}))

vi.mock('../../src/extension/grpc/runnerTypes', () => ({}))

test('initializes all providers', async () => {
  const configValues = {
    binaryPath: 'bin'
  }
  vi.mocked(workspace.getConfiguration).mockReturnValue({
    get: vi.fn((config: string) => configValues[config])
  } as any)
  const context: any = { subscriptions: [], extensionUri: { fsPath: '/foo/bar' } }
  const ext = new RunmeExtension()
  await ext.initialize(context)
  expect(notebooks.registerNotebookCellStatusBarItemProvider).toBeCalledTimes(6)
  expect(workspace.registerNotebookSerializer).toBeCalledTimes(1)
  expect(commands.registerCommand).toBeCalledTimes(14)
  expect(window.registerTreeDataProvider).toBeCalledTimes(1)
  expect(window.registerUriHandler).toBeCalledTimes(1)

  expect(commands.executeCommand).toBeCalledWith('vscode.open', '/foo/bar')
  expect(workspace.fs.stat).toBeCalledWith('/foo/bar')
  expect(workspace.fs.delete).toBeCalledWith('/foo/bar')
})
