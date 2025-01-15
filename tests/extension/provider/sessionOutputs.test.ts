import { vi, describe, it, expect } from 'vitest'
import { commands, ExtensionContext, NotebookCellKind, Uri } from 'vscode'

import { SessionOutputCellStatusBarProvider } from '../../../src/extension/provider/cellStatusBar/sessionOutput'
import { Kernel } from '../../../src/extension/kernel'
import { StatefulAuthProvider } from '../../../src/extension/provider/statefulAuth'

vi.mock('vscode')
vi.mock('vscode-telemetry')

vi.mock('../../../src/extension/grpc/tcpClient', () => ({
  ParserServiceClient: vi.fn(),
}))

vi.mock('../../../src/extension/utils', () => ({
  getAnnotations: vi.fn().mockReturnValue({
    background: false,
    interactive: true,
    closeTerminalOnSuccess: true,
    openTerminalOnError: true,
    mimeType: 'text/plain',
    name: 'npm-install',
    'runme.dev/id': '01HGVC6M8Y76XAGAY6MQ06F5XS',
  }),
  validateAnnotations: vi.fn(),
  replaceOutput: vi.fn(),
}))

vi.mock('../../../src/extension/runner', () => ({}))
vi.mock('../../../src/extension/grpc/runner/v1', () => ({}))

const contextFake: ExtensionContext = {
  extensionUri: Uri.parse('file:///Users/fakeUser/projects/vscode-runme'),
  secrets: {
    store: vi.fn(),
  },
  subscriptions: [],
} as any

StatefulAuthProvider.initialize(contextFake)

describe('Preview Outputs Cell Status Bar provider', () => {
  const kernel = new Kernel({} as any)
  it('should register commands when initializing', () => {
    new SessionOutputCellStatusBarProvider(kernel)
    expect(commands.registerCommand).toBeCalledTimes(0)
  })

  describe('provideCellStatusBarItems', () => {
    it('should not create a status bar item for non-code elements', async () => {
      const annotationsProvider = new SessionOutputCellStatusBarProvider(kernel)
      const cell = {
        metadata: {
          background: 'true',
        },
        executionSummary: {
          success: false,
        },
        kind: NotebookCellKind.Markup,
      }
      const statusBarItems = await annotationsProvider.provideCellStatusBarItems(cell as any)
      expect(statusBarItems).toBe(undefined)
    })

    it('should create a status bar item for code elements', async () => {
      const sessionOutputProvider = new SessionOutputCellStatusBarProvider(kernel)
      const cell = {
        metadata: {
          background: 'true',
        },
        notebook: {
          metadata: {
            ['runme.dev/frontmatterParsed']: {
              runme: {
                session: {
                  id: 'session_id', // Ensure is a session output file
                },
              },
            },
          },
        },
        executionSummary: {
          success: false,
        },
        kind: NotebookCellKind.Code,
      }

      const statusBarItems = await sessionOutputProvider.provideCellStatusBarItems(cell as any)
      expect(statusBarItems?.length).toEqual(1)
    })
  })
})
