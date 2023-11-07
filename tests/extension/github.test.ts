import {
  NotebookCell,
  NotebookCellExecution,
  NotebookController,
  window,
  authentication,
  AuthenticationSession,
} from 'vscode'
import { expect, suite, vi, test } from 'vitest'

import * as CellManager from '../../src/extension/cell'
import { github } from '../../src/extension/executors/github'
import { Kernel } from '../../src/extension/kernel'

vi.mock('vscode', async () => {
  const vscode = await import('../../__mocks__/vscode')
  return {
    default: vscode,
    ...vscode,
  }
})
vi.mock('vscode-telemetry')

vi.mock('../../src/extension/grpc/client', () => ({}))
vi.mock('../../src/extension/grpc/runnerTypes', () => ({}))

class OctokitMock {
  protected rest: any
  constructor() {
    this.rest = {
      repos: {
        getContent: vi.fn().mockResolvedValue({
          data: {
            content: 'yaml content here ...',
          },
        }),
      },
    }
  }
}

vi.mock('octokit', () => {
  return {
    Octokit: vi.fn().mockImplementation(() => new OctokitMock()),
  }
})

function mockCellExecution(cell: NotebookCell) {
  const replaceOutput = vi.fn()
  return {
    start: vi.fn(),
    end: vi.fn(),
    replaceOutput,
    clearOutput: vi.fn(),
    cell,
  } as unknown as NotebookCellExecution
}

function mockCell(outputs: any[] = [], metadata: any = {}, documentText?: string) {
  return {
    outputs,
    metadata,
    document: {
      getText: vi.fn().mockReturnValue(documentText),
    },
    notebook: {
      uri: '',
    },
  } as unknown as NotebookCell
}

function mockNotebookController(cell: NotebookCell) {
  const exec = mockCellExecution(cell)
  const replaceOutput = vi.mocked(exec.replaceOutput)

  const createExecution = vi.fn().mockReturnValue(exec)

  const controller = {
    createNotebookCellExecution: createExecution,
  } as unknown as NotebookController

  return { replaceOutput, controller, exec, createExecution }
}

test("It fails when a GitHub session can't be stablished", async () => {
  const cell = mockCell([{ items: [] }])
  const { controller, createExecution } = mockNotebookController(cell)
  const outputs = new CellManager.NotebookCellOutputManager(cell, controller)
  const exec = createExecution()
  const kernel = new Kernel({} as any)
  vi.mocked(authentication.getSession).mockRejectedValue('Authentication cancelled by user')
  const executionResult = await github.call(kernel, exec, cell.document, outputs)
  expect(executionResult).toBe(false)
  expect(window.showErrorMessage).toBeCalled()
})

suite('When a valid session is stablished', () => {
  test('It fails for incomplete workflow file URL Schema', async () => {
    const cell = mockCell([{ items: [] }], {}, 'https://github.com/')
    const { controller, createExecution } = mockNotebookController(cell)
    const outputs = new CellManager.NotebookCellOutputManager(cell, controller)
    const exec = createExecution()
    const kernel = new Kernel({} as any)
    const authenticationSession: AuthenticationSession = {
      accessToken: '',
      id: '',
      scopes: ['repo'],
      account: {
        id: '',
        label: '',
      },
    }
    vi.mocked(authentication.getSession).mockResolvedValue(authenticationSession)
    const executionResult = await github.call(kernel, exec, cell.document, outputs)
    expect(executionResult).toBe(false)
    expect(window.showErrorMessage).toBeCalled()
  })

  test('It should allow a workflow file from the source URL', async () => {
    const workflowSourceFile =
      'https://github.com/stateful/vscode-runme/blob/main/.github/workflows/release.yml'
    const cell = mockCell([{ items: [] }], {}, workflowSourceFile)
    const { controller, createExecution } = mockNotebookController(cell)
    const outputs = new CellManager.NotebookCellOutputManager(cell, controller)
    const exec = createExecution()
    const kernel = new Kernel({} as any)
    const authenticationSession: AuthenticationSession = {
      accessToken: '',
      id: '',
      scopes: ['repo'],
      account: {
        id: '',
        label: '',
      },
    }
    const outputSpy = vi.spyOn(outputs, 'setState')
    vi.mocked(authentication.getSession).mockResolvedValue(authenticationSession)
    const executionResult = await github.call(kernel, exec, cell.document, outputs)
    expect(outputSpy).toBeCalledTimes(1)
    expect(executionResult).toBe(true)
  })

  test('It should allow a workflow file from the workflow URL', async () => {
    const workflowSourceFile =
      'https://github.com/stateful/vscode-runme/actions/workflows/release.yml'
    const cell = mockCell([{ items: [] }], {}, workflowSourceFile)
    const { controller, createExecution } = mockNotebookController(cell)
    const outputs = new CellManager.NotebookCellOutputManager(cell, controller)
    const exec = createExecution()
    const kernel = new Kernel({} as any)
    const authenticationSession: AuthenticationSession = {
      accessToken: '',
      id: '',
      scopes: ['repo'],
      account: {
        id: '',
        label: '',
      },
    }
    const outputSpy = vi.spyOn(outputs, 'setState')
    vi.mocked(authentication.getSession).mockResolvedValue(authenticationSession)
    const executionResult = await github.call(kernel, exec, cell.document, outputs)
    expect(outputSpy).toBeCalledTimes(1)
    expect(executionResult).toBe(true)
  })
})
