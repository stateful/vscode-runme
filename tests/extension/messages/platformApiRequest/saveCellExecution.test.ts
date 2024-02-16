import { AuthenticationSession, authentication, notebooks } from 'vscode'
import { suite, vi, it, beforeAll, afterAll, afterEach, expect } from 'vitest'
import { HttpResponse, graphql } from 'msw'
import { setupServer } from 'msw/node'

import saveCellExecution, {
  type APIRequestMessage,
} from '../../../../src/extension/messages/platformRequest/saveCellExecution'
import { Kernel } from '../../../../src/extension/kernel'
import { ClientMessages } from '../../../../src/constants'
import { APIMethod } from '../../../../src/types'
import { getCellById } from '../../../../src/extension/cell'

vi.mock('vscode-telemetry')
vi.mock('../../../src/extension/runner', () => ({}))
vi.mock('../../../src/extension/grpc/runnerTypes', () => ({}))

vi.mock('vscode', async () => {
  const mocked = (await vi.importActual('../../../../__mocks__/vscode')) as any
  return {
    ...mocked,
    default: {
      NotebookCellKind: {
        Markup: 1,
        Code: 2,
      },
    },
  }
})

vi.mock('../../../../src/extension/cell', async () => {
  const actual = await import('../../../../src/extension/cell')
  return {
    ...actual,
    getCellById: vi.fn(),
  }
})

const graphqlHandlers = [
  graphql.mutation('CreateCellExecution', () => {
    return HttpResponse.json({
      data: {
        id: 'cell-id',
        htmlUrl: 'https://app.runme.dev/cell/gotyou!',
      },
    })
  }),
]

const server = setupServer(...graphqlHandlers)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterAll(() => {
  server.close()
})

afterEach(() => {
  server.resetHandlers()
})

suite('Save cell execution', () => {
  const kernel = new Kernel({} as any)
  kernel.getTerminal = vi.fn().mockReturnValue({
    processId: 100,
    runnerSession: {
      hasExited: vi.fn(),
    },
  })

  it('Should save the output for authenticated user', async () => {
    const cell: any = {
      metadata: { name: 'foobar', id: 'cell-id', ['runme.dev/id']: 'cell-id' },
      document: {
        uri: { fsPath: '/foo/bar/README.md' },
        getText: () => 'hello world',
        languageId: 'sh',
      },
      kind: 2,
    }

    cell.notebook = {
      getCells: () => [cell],
      isDirty: false,
    }
    vi.mocked(getCellById).mockResolvedValue(cell)
    const messaging = notebooks.createRendererMessaging('runme-renderer')
    const authenticationSession: AuthenticationSession = {
      accessToken: '',
      id: '',
      scopes: ['repo'],
      account: {
        id: '',
        label: '',
      },
    }
    const message = {
      type: ClientMessages.platformApiRequest,
      output: {
        id: 'cell-id',
        method: APIMethod.CreateCellExecution,
        data: {
          stdout: 'hello world',
        },
      },
    } as any
    const requestMessage: APIRequestMessage = {
      messaging,
      message,
      editor: {
        notebook: {
          metadata: {
            ['runme.dev/frontmatterParsed']: { runme: { id: 'ulid' } },
          },
        },
      } as any,
    }
    vi.mocked(authentication.getSession).mockResolvedValue(authenticationSession)

    await saveCellExecution(requestMessage, kernel)

    expect(messaging.postMessage).toBeCalledWith({
      output: {
        data: {
          data: {
            id: 'cell-id',
            htmlUrl: 'https://app.runme.dev/cell/gotyou!',
          },
        },
        id: 'cell-id',
      },
      type: 'common:platformApiResponse',
    })
  })

  it('Should not save cell output when user is not authenticated', async () => {
    const cell: any = {
      metadata: { name: 'foobar', id: 'cell-id', ['runme.dev/id']: 'cell-id' },
      document: {
        uri: { fsPath: '/foo/bar/README.md' },
        getText: () => 'hello world',
        languageId: 'sh',
      },
      kind: 2,
    }
    cell.notebook = {
      getCells: () => [cell],
      isDirty: false,
    }
    vi.mocked(getCellById).mockResolvedValue(cell)
    const messaging = notebooks.createRendererMessaging('runme-renderer')
    const message = {
      type: ClientMessages.platformApiRequest,
      output: {
        id: 'cell-id',
        method: APIMethod.CreateCellExecution,
        data: {
          stdout: 'hello world',
        },
      },
    } as any
    const requestMessage: APIRequestMessage = {
      messaging,
      message,
      editor: {
        notebook: {
          metadata: {
            ['runme.dev/frontmatterParsed']: { runme: { id: 'ulid' } },
          },
        },
      } as any,
    }
    vi.mocked(authentication.getSession).mockResolvedValue(undefined)

    await saveCellExecution(requestMessage, kernel)

    expect(messaging.postMessage).toBeCalledWith({
      output: {
        data: {
          displayShare: false,
        },
        id: 'cell-id',
      },
      type: 'common:platformApiResponse',
    })
  })
})
