import { vi, expect, describe, it, beforeEach, afterEach } from 'vitest'
import { AuthenticationSessionsChangeEvent, NotebookCell, NotebookEditor } from 'vscode'
import { Subject } from 'rxjs'

import { CellRun, SignedIn } from '../../src/extension/signedIn'
import { RunmeEventInputType } from '../../src/extension/__generated-platform__/graphql'
import { APIMethod } from '../../src/types'
import { ClientMessages } from '../../src/constants'
import AuthSessionChangeHandler from '../../src/extension/authSessionChangeHandler'
import { StatefulAuthProvider } from '../../src/extension/provider/statefulAuth'

vi.mock('../../src/extension/logger', () => {
  return {
    default: vi.fn(),
  }
})

vi.mock('../../src/extension/provider/statefulAuth', () => {
  return {
    StatefulAuthProvider: {
      instance: {
        currentSession: vi.fn().mockResolvedValue({}),
      },
    },
  }
})

vi.mock('../../src/extension/authSessionChangeHandler', () => {
  return {
    default: {
      instance: {
        addListener: vi.fn(),
      },
    },
  }
})

vi.mock('../../src/extension/serializer', () => {
  return {
    ConnectSerializer: {
      marshalFrontmatter: vi.fn().mockImplementation(() => ({
        runme: { id: 'notebook-id' },
      })),
    },
  }
})

describe('SignedIn', () => {
  let mockKernel: any
  let signedIn: SignedIn | null

  beforeEach(() => {
    mockKernel = {
      handleRendererMessage: vi.fn().mockResolvedValue(true),
    }
    signedIn = new SignedIn(mockKernel)
  })

  afterEach(() => {
    signedIn?.dispose()
    signedIn = null
  })

  it('should initialize observables correctly', () => {
    expect(signedIn).toBeDefined()
    expect(signedIn?.['cellRuns']).toBeDefined()
    expect(signedIn?.['subscriptions']).toBeDefined()
  })

  it('should dispose subscriptions correctly', () => {
    const subscription = { unsubscribe: vi.fn() }
    signedIn?.['subscriptions'].push(subscription as any)
    signedIn?.dispose()

    expect(subscription.unsubscribe).toHaveBeenCalled()
  })

  it('should enqueue cell run correctly', async () => {
    const mockCell = {
      notebook: {
        metadata: {},
        uri: { path: '/path/to/notebook' },
      },
      metadata: { 'runme.dev/id': 'cell-id' },
    } as unknown as NotebookCell
    const mockEditor = {} as NotebookEditor
    const startTime = 1000
    const endTime = 2000
    const success = true

    const cellRunSubject = signedIn?.['cellRuns'] as Subject<CellRun>
    await new Promise((resolve) => {
      cellRunSubject.subscribe((cellRun) => {
        expect(mockKernel.handleRendererMessage).toHaveBeenCalledWith({
          editor: mockEditor,
          message: {
            output: {
              data: {
                type: RunmeEventInputType.RunCell,
                cell: cellRun.cell,
                notebook: cellRun.notebook,
                executionSummary: cellRun.executionSummary,
              },
              id: '',
              method: APIMethod.TrackRunmeEvent,
            },
            type: ClientMessages.platformApiRequest,
          },
        })

        resolve(undefined)
      })

      signedIn?.enqueueCellRun(mockCell, mockEditor, success, startTime, endTime)
    })
  })

  it('should call currentSession twice when auth session changes', async () => {
    let listener: (event: AuthenticationSessionsChangeEvent) => void

    vi.mocked(StatefulAuthProvider.instance.currentSession).mockReset()
    vi.mocked(AuthSessionChangeHandler.instance.addListener).mockImplementationOnce((l) => {
      listener = l
    })

    signedIn = new SignedIn(mockKernel)

    listener!({ provider: { id: 'provider-id' } } as unknown as AuthenticationSessionsChangeEvent)

    expect(StatefulAuthProvider.instance.currentSession).toHaveBeenCalledTimes(2)
  })
})
