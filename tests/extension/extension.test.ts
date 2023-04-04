import { test, expect, vi } from 'vitest'
import { notebooks, workspace, commands, window, Uri } from 'vscode'

import { RunmeExtension } from '../../src/extension/extension'
import RunmeServer from '../../src/extension/server/runmeServer'
import { testCertPEM, testPrivKeyPEM } from '../testTLSCert'

vi.mock('vscode')
vi.mock('vscode-telemetry')

vi.mock('../../src/extension/grpc/client', () => {
  class MockedParserServiceClient {
    deserialize = vi.fn(() => {
      return { status: { code: 'OK' } }
    })
  }

  return ({
    ParserServiceClient: MockedParserServiceClient,
    RunnerServiceClient: vi.fn(),
    initParserClient: vi.fn(() => ({
      deserialize: vi.fn(() => {
        return { status: { code: 'OK' } }
      })
    })),
  })
})

vi.mock('../../src/extension/grpc/runnerTypes', () => ({}))

test('initializes all providers', async () => {
  const configValues = {
    binaryPath: 'bin'
  }
  vi.mocked(workspace.getConfiguration).mockReturnValue({
    get: vi.fn((config: string) => configValues[config])
  } as any)
  vi.mocked(Uri.joinPath).mockReturnValue('/foo/bar' as any)
  RunmeServer['getTLS'] = vi.fn().mockResolvedValue({ privKeyPEM: testPrivKeyPEM, certPEM: testCertPEM })
  const context: any = { subscriptions: [], extensionUri: { fsPath: '/foo/bar' } }
  const ext = new RunmeExtension()
  await ext.initialize(context)
  expect(notebooks.registerNotebookCellStatusBarItemProvider).toBeCalledTimes(6)
  expect(workspace.registerNotebookSerializer).toBeCalledTimes(1)
  expect(commands.registerCommand).toBeCalledTimes(15)
  expect(window.registerTreeDataProvider).toBeCalledTimes(1)
  expect(window.registerUriHandler).toBeCalledTimes(1)

  expect(commands.executeCommand).toBeCalledWith('vscode.open', '/foo/bar')
  expect(workspace.fs.stat).toBeCalledWith('/foo/bar')
  expect(workspace.fs.delete).toBeCalledWith('/foo/bar')
})
