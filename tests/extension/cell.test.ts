import { NotebookCell, NotebookCellExecution, NotebookController, commands, window } from 'vscode'
import { describe, expect, it, vi } from 'vitest'

import { OutputType } from '../../src/constants'
import {
  NotebookCellManager,
  NotebookCellOutputManager,
  RunmeNotebookCellExecution,
} from '../../src/extension/cell'

function mockedNotebookCellExecution(): NotebookCellExecution {
  return {
    start: vi.fn(),
    end: vi.fn(),
  } as unknown as NotebookCellExecution
}

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

describe('NotebookCellManager', () => {
  it('can register cells', () => {
    const manager = new NotebookCellManager({} as any)
    const cell = {} as any

    manager.registerCell(cell)
    expect(manager.getNotebookOutputs(cell)).toBeTruthy()

    const errorMock = vi.spyOn(console, 'error')

    expect(manager.getNotebookOutputs({} as any)).resolves.toBeInstanceOf(NotebookCellOutputManager)
    expect(errorMock.mock.calls[0][0]).toMatch('has not been registered')
  })
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

function mockCell(outputs: any[] = [], metadata: any = {}) {
  return {
    outputs,
    metadata,
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

describe('NotebookCellOutputManager', () => {
  it('uses current execution for outputs', async () => {
    const cell = mockCell()

    const { controller, createExecution } = mockNotebookController(cell)

    const outputs = new NotebookCellOutputManager(cell, controller)

    const exec1 = mockCellExecution(cell)
    createExecution.mockReturnValue(exec1)

    const runmeExec = await outputs.createNotebookCellExecution()
    expect(runmeExec).toBeTruthy()

    runmeExec!.start()

    await outputs.toggleOutput(OutputType.annotations)
    expect(vi.mocked(exec1.replaceOutput)).toBeCalledTimes(1)

    runmeExec!.end(undefined)

    createExecution.mockReturnValue(mockCellExecution(cell))
    await outputs.toggleOutput(OutputType.annotations)

    expect(vi.mocked(exec1.replaceOutput)).toBeCalledTimes(1)
  })

  it('waits on current execution before creating a new one', async () => {
    const cell = mockCell()

    const { controller, createExecution } = mockNotebookController(cell)

    const outputs = new NotebookCellOutputManager(cell, controller)

    const runmeExec = await outputs.createNotebookCellExecution()
    expect(runmeExec).toBeTruthy()

    runmeExec!.start()

    expect(createExecution).toHaveBeenCalledTimes(1)

    outputs.createNotebookCellExecution()

    await new Promise((r) => setTimeout(r, 100))
    expect(createExecution).toHaveBeenCalledTimes(1)

    runmeExec!.end(undefined)

    await new Promise((r) => setTimeout(r, 100))
    expect(createExecution).toHaveBeenCalledTimes(2)
  })

  it('fails to create new execution if execution fails', async () => {
    vi.mocked(commands.executeCommand).mockClear()

    const cell = mockCell()

    const { controller, createExecution } = mockNotebookController(cell)

    createExecution.mockImplementationOnce(() => {
      throw new Error('controller is NOT associated')
    })
    vi.mocked(window.showInformationMessage).mockResolvedValueOnce({} as any)

    const outputs = new NotebookCellOutputManager(cell, controller)

    const runmeExec = await outputs.createNotebookCellExecution()
    expect(runmeExec).toBeUndefined()

    expect(commands.executeCommand).toBeCalledWith('_notebook.selectKernel')
  })

  it("fails to create new execution if execution fails and user doesn't select kernel", async () => {
    vi.mocked(commands.executeCommand).mockClear()

    const cell = mockCell()

    const { controller, createExecution } = mockNotebookController(cell)

    createExecution.mockImplementationOnce(() => {
      throw new Error('controller is NOT associated')
    })
    vi.mocked(window.showInformationMessage).mockResolvedValueOnce(undefined)

    const outputs = new NotebookCellOutputManager(cell, controller)

    const runmeExec = await outputs.createNotebookCellExecution()
    expect(runmeExec).toBeUndefined()

    expect(commands.executeCommand).not.toBeCalled()
  })

  it('fails to create new execution if notebook selection command does not exist', async () => {
    const cell = mockCell()

    const { controller, createExecution } = mockNotebookController(cell)

    createExecution.mockImplementationOnce(() => {
      throw new Error('controller is NOT associated')
    })
    vi.mocked(window.showInformationMessage).mockResolvedValueOnce({} as any)

    vi.mocked(commands.getCommands).mockResolvedValueOnce([])

    const outputs = new NotebookCellOutputManager(cell, controller)

    const runmeExec = await outputs.createNotebookCellExecution()
    expect(runmeExec).toBeUndefined()

    expect(window.showWarningMessage).toBeCalledWith(
      'Please select a kernel (top right: "Select Kernel") to continue.',
    )
  })

  it('creates a new execution if none exists', async () => {
    const cell = mockCell()

    const { controller, createExecution, exec } = mockNotebookController(cell)

    const outputs = new NotebookCellOutputManager(cell, controller)

    await outputs.toggleOutput(OutputType.annotations)
    expect(createExecution).toHaveBeenCalledOnce()

    expect(vi.mocked(exec.start)).toHaveBeenCalledOnce()
    expect(vi.mocked(exec.end)).toHaveBeenCalledOnce()
  })

  it('toggles based on output status if present', async () => {
    const cell = mockCell([{ items: [{ mime: OutputType.annotations }] }])

    const { controller, replaceOutput } = mockNotebookController(cell)

    const outputs = new NotebookCellOutputManager(cell, controller)

    await outputs.toggleOutput(OutputType.annotations)
    expect(replaceOutput).toBeCalledWith([], undefined)
  })

  it('toggles based on output status if not present', async () => {
    const cell = mockCell([{ items: [] }])

    const { controller, replaceOutput } = mockNotebookController(cell)

    const outputs = new NotebookCellOutputManager(cell, controller)

    await outputs.toggleOutput(OutputType.annotations)
    const result = replaceOutput.mock.calls[0][0]
    expect(result).toHaveLength(1)
    expect(result[0].items).toHaveLength(2)
    expect(result[0].items[0].mime).toBe(OutputType.annotations)
  })

  it('supports annotation type', async () => {
    const cell = mockCell([{ items: [] }])

    const { controller, replaceOutput } = mockNotebookController(cell)

    const outputs = new NotebookCellOutputManager(cell, controller)

    await outputs.showOutput(OutputType.annotations)

    expect(replaceOutput).toHaveBeenCalledOnce()
    const result = replaceOutput.mock.calls[0][0]

    expect(result).toHaveLength(1)
    expect(result[0].items).toHaveLength(2)
    expect(result[0].items[0].mime).toBe(OutputType.annotations)
  })

  it('supports vercel type', async () => {
    const cell = mockCell([{ items: [] }])

    const { controller, replaceOutput } = mockNotebookController(cell)

    const outputs = new NotebookCellOutputManager(cell, controller)

    const outputSpy = vi.spyOn(outputs, 'getCellState')
    await outputs.showOutput(OutputType.vercel)

    expect(replaceOutput).toHaveBeenCalledOnce()
    const result = replaceOutput.mock.calls[0][0]

    expect(result).toHaveLength(1)
    expect(result[0].items).toHaveLength(1)
    expect(result[0].items[0].mime).toBe(OutputType.vercel)
    expect(outputSpy).toHaveBeenCalledWith(OutputType.vercel)
    expect(outputSpy).toHaveBeenCalledOnce()
  })

  it('supports deno type', async () => {
    const cell = mockCell([{ items: [] }])

    const { controller, replaceOutput } = mockNotebookController(cell)

    const outputs = new NotebookCellOutputManager(cell, controller)

    await outputs.showOutput(OutputType.deno)

    expect(replaceOutput).toHaveBeenCalledOnce()
    const result = replaceOutput.mock.calls[0][0]

    expect(result).toHaveLength(1)
    expect(result[0].items).toHaveLength(1)
    expect(result[0].items[0].mime).toBe(OutputType.deno)
  })

  it('supports github type', async () => {
    const cell = mockCell([{ items: [] }])

    const { controller, replaceOutput } = mockNotebookController(cell)

    const outputs = new NotebookCellOutputManager(cell, controller)

    const outputSpy = vi.spyOn(outputs, 'getCellState')
    await outputs.showOutput(OutputType.github)

    expect(replaceOutput).toHaveBeenCalledOnce()
    const result = replaceOutput.mock.calls[0][0]

    expect(result).toHaveLength(1)
    expect(result[0].items).toHaveLength(1)
    expect(result[0].items[0].mime).toBe(OutputType.github)
    expect(outputSpy).toHaveBeenCalledWith(OutputType.github)
    expect(outputSpy).toHaveBeenCalledOnce()
  })

  it('returns empty state for Output type mismatch', async () => {
    const cell = mockCell([{ items: [] }])

    const { controller } = mockNotebookController(cell)

    const outputs = new NotebookCellOutputManager(cell, controller)

    outputs.setState({
      type: OutputType.vercel,
      state: {
        payload: 'vercel',
        outputItems: [],
      },
    })
    await outputs.showOutput(OutputType.github)
    expect(outputs.getCellState(OutputType.github)).toBeUndefined()
  })

  it('does not update cells if refreshing non present type', async () => {
    const cell = mockCell([{ items: [] }])

    const { controller, replaceOutput } = mockNotebookController(cell)

    const outputs = new NotebookCellOutputManager(cell, controller)

    await outputs.refreshOutput(OutputType.annotations)
    expect(replaceOutput).toHaveBeenCalledTimes(0)
  })

  it('does update cells if refreshing present type', async () => {
    const cell = mockCell([{ items: [{ mime: OutputType.annotations }] }])

    const { controller, replaceOutput } = mockNotebookController(cell)

    const outputs = new NotebookCellOutputManager(cell, controller)

    await outputs.refreshOutput(OutputType.annotations)
    expect(replaceOutput).toHaveBeenCalledTimes(1)
  })
})

describe('RunmeNotebookCellExecution', () => {
  it('runs onEnd when end is called', () => {
    const exec = mockedNotebookCellExecution()
    const runmeExec = new RunmeNotebookCellExecution(exec)

    runmeExec.start(100)
    expect(vi.mocked(exec.start)).toBeCalledTimes(1)
    expect(vi.mocked(exec.start)).toBeCalledWith(100)

    const onEndFunc = vi.fn()
    runmeExec.onEnd(onEndFunc)

    runmeExec.end(false, 200)
    expect(vi.mocked(exec.end)).toBeCalledTimes(1)
    expect(vi.mocked(exec.end)).toBeCalledWith(false, 200)

    expect(onEndFunc).toBeCalledTimes(1)
    expect(onEndFunc).toBeCalledWith({ success: false, endTime: 200 })
  })

  it('gives underlying execution', () => {
    const exec = mockedNotebookCellExecution()
    const runmeExec = new RunmeNotebookCellExecution(exec)

    expect(runmeExec.underlyingExecution).toStrictEqual(exec)
  })
})
