import { test, expect, vi } from 'vitest'
import { notebooks, workspace, commands, window, Uri } from 'vscode'
// eslint-disable-next-line max-len
import { HealthCheckResponse_ServingStatus } from '@buf/grpc_grpc.community_timostamm-protobuf-ts/grpc/health/v1/health_pb'

import { RunmeExtension } from '../../src/extension/extension'
import { bootFile } from '../../src/extension/utils'
import KernelServer from '../../src/extension/server/kernelServer'
import { testCertPEM, testPrivKeyPEM } from '../testTLSCert'

vi.mock('vscode')
vi.mock('vscode-telemetry')

vi.mock('../../src/extension/provider/runmeTask', () => {
  class RunmeTaskProvider {
    static id = 'runme'
  }
  return { RunmeTaskProvider }
})

vi.mock('../../src/extension/panels/panel', () => {
  class Panel {
    registerBus = vi.fn()
  }
  return { default: Panel }
})

vi.mock('../../src/extension/grpc/client', () => {
  class MockedParserServiceClient {
    deserialize = vi.fn(() => {
      return { status: { code: 'OK' } }
    })
  }

  return {
    ParserServiceClient: MockedParserServiceClient,
    RunnerServiceClient: vi.fn(),
    ProjectServiceClient: vi.fn(),
    initParserClient: vi.fn(() => ({
      deserialize: vi.fn(() => {
        return { status: { code: 'OK' } }
      }),
    })),
    initProjectClient: vi.fn(() => ({
      load: vi.fn(() => {
        return { responses: { onMessage: vi.fn() } }
      }),
    })),
    initReporterClient: vi.fn(() => ({})),
    HealthClient: class {
      async check() {
        return {
          response: {
            status: HealthCheckResponse_ServingStatus.SERVING,
          },
        }
      }
    },
  }
})

vi.mock('../../src/extension/utils', async () => ({
  getDefaultWorkspace: vi.fn(),
  initWasm: vi.fn(),
  getNamespacedMid: vi.fn(),
  isWindows: vi.fn().mockReturnValue(false),
  bootFile: vi.fn().mockResolvedValue(undefined),
  checkSession: vi.fn(),
  togglePreviewButton: vi.fn(),
  resetNotebookSettings: vi.fn(),
  getGithubAuthSession: vi.fn().mockResolvedValue(undefined),
  getPlatformAuthSession: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('../../src/extension/grpc/runner/v1', () => ({}))

test('initializes all providers', async () => {
  const configValues = {
    binaryPath: 'bin',
    // This is needed for the AIManager to initialize.
    aiBaseURL: 'http://localhost:8877/api',
  }
  vi.mocked(workspace.getConfiguration).mockReturnValue({
    get: vi.fn((config: string) => configValues[config]),
  } as any)
  const dummyFilePath = Uri.file('/foo/bar')
  vi.mocked(Uri.joinPath).mockReturnValue(dummyFilePath)
  KernelServer['getTLS'] = vi
    .fn()
    .mockResolvedValue({ privKeyPEM: testPrivKeyPEM, certPEM: testCertPEM })
  const context: any = {
    subscriptions: [],
    extensionUri: { fsPath: '/foo/bar' },
    environmentVariableCollection: {
      prepend: vi.fn(),
      append: vi.fn(),
      replace: vi.fn(),
    },
    globalState: {
      get: vi.fn(),
    },
  }
  const ext = new RunmeExtension()
  await ext.initialize(context)
  expect(notebooks.registerNotebookCellStatusBarItemProvider).toBeCalledTimes(5)
  expect(workspace.registerNotebookSerializer).toBeCalledTimes(1)
  expect(commands.registerCommand).toBeCalledTimes(41)
  expect(window.registerTreeDataProvider).toBeCalledTimes(1)
  expect(window.registerUriHandler).toBeCalledTimes(1)
  expect(bootFile).toBeCalledTimes(1)
})
