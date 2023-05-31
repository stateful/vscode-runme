import { test, expect, vi, suite } from 'vitest'
import { window, NotebookCell } from 'vscode'

import { Kernel } from '../../src/extension/kernel'
import { resetEnv } from '../../src/extension/utils'
import executors from '../../src/extension/executors'
import { TelemetryReporter } from '../../__mocks__/vscode-telemetry'

vi.mock('vscode')
vi.mock('vscode-telemetry')
vi.mock('../../src/extension/utils', () => ({
  resetEnv: vi.fn(),
  getKey: vi.fn().mockReturnValue('foobar'),
  getAnnotations: vi.fn((cell) => cell.metadata),
  getNotebookCategories: vi.fn().mockResolvedValue([])
}))
vi.mock('../../src/extension/executors/index.js', () => ({
  default: { foobar: vi.fn() },
  ENV_STORE_MANAGER: {}
}))
vi.mock('../../src/extension/runner', () => ({}))

const getCells = (cnt: number, metadata: Record<string, any> = {}) => ([...new Array(cnt)]).map((_, i) => ({
  document: { getText: vi.fn().mockReturnValue(`Cell #${i}`) },
  notebook: {
    getCells: vi.fn().mockReturnValue(
      [...new Array(10)].map(() => ({ kind: 1 }))
    )
  },
  metadata: {
    'runme.dev/name': `Cell #${i}`,
    ...metadata
  }
}) as any as NotebookCell)

test('dispose', () => {
  const k = new Kernel({} as any)
  k.dispose()
  expect(resetEnv).toBeCalledTimes(1)
})

suite('_executeAll', async () => {
  test('runs individual cells or cell selections', async () => {
    window.showQuickPick = vi.fn().mockReturnValue(new Promise(() => { }))
    const k = new Kernel({} as any)
    k['_doExecuteCell'] = vi.fn()
    await k['_executeAll'](getCells(10).slice(0, 5))
    expect(k['_doExecuteCell']).toBeCalledTimes(5)
    expect(TelemetryReporter.sendTelemetryEvent).lastCalledWith(
      'cells.executeAll',
      { 'cells.executed': '5', 'cells.total': '10' }
    )
  })

  test('runs cells if answer is yes', async () => {
    const k = new Kernel({} as any)
    // @ts-ignore readonly
    window.showQuickPick = vi.fn().mockResolvedValue('Yes')
    k['_doExecuteCell'] = vi.fn()
    await k['_executeAll'](getCells(10))
    expect(window.showQuickPick).toBeCalledTimes(10)
    expect(k['_doExecuteCell']).toBeCalledTimes(10)
    expect(TelemetryReporter.sendTelemetryEvent).lastCalledWith(
      'cells.executeAll',
      { 'cells.executed': '10', 'cells.total': '10' }
    )
  })

  test('do not show confirmation for notebooks with just one cell', async () => {
    const k = new Kernel({} as any)
    // @ts-ignore readonly
    window.showQuickPick = vi.fn().mockResolvedValue('Yes')
    k['_doExecuteCell'] = vi.fn()
    await k['_executeAll'](getCells(1))
    expect(window.showQuickPick).toBeCalledTimes(0)
    expect(k['_doExecuteCell']).toBeCalledTimes(1)
    expect(TelemetryReporter.sendTelemetryEvent).lastCalledWith(
      'cells.executeAll',
      { 'cells.executed': '1', 'cells.total': '10' }
    )
  })

  test('runs no cells if answer is no', async () => {
    const k = new Kernel({} as any)
    // @ts-ignore readonly
    window.showQuickPick = vi.fn().mockResolvedValue('No')
    k['_doExecuteCell'] = vi.fn()
    await k['_executeAll'](getCells(10))
    expect(window.showQuickPick).toBeCalledTimes(10)
    expect(k['_doExecuteCell']).toBeCalledTimes(0)
    expect(TelemetryReporter.sendTelemetryEvent).lastCalledWith(
      'cells.executeAll',
      { 'cells.executed': '0', 'cells.total': '10' }
    )
  })

  test('cancels execution completely', async () => {
    const k = new Kernel({} as any)
    // @ts-ignore readonly
    window.showQuickPick = vi.fn().mockResolvedValue('Cancel')
    k['_doExecuteCell'] = vi.fn()
    await k['_executeAll'](getCells(10))
    expect(window.showQuickPick).toBeCalledTimes(1)
    expect(k['_doExecuteCell']).toBeCalledTimes(0)
    expect(TelemetryReporter.sendTelemetryEvent).lastCalledWith(
      'cells.executeAll',
      { 'cells.executed': '0', 'cells.total': '10' }
    )
  })

  test('skips prompt', async () => {
    const k = new Kernel({} as any)
    // @ts-ignore readonly
    window.showQuickPick = vi.fn().mockResolvedValue('Skip Prompt and run all')
    k['_doExecuteCell'] = vi.fn()
    await k['_executeAll'](getCells(10))
    expect(window.showQuickPick).toBeCalledTimes(1)
    expect(k['_doExecuteCell']).toBeCalledTimes(10)
    expect(TelemetryReporter.sendTelemetryEvent).lastCalledWith(
      'cells.executeAll',
      { 'cells.executed': '10', 'cells.total': '10' }
    )
  })

  test('does not runs any cells for non-existent cell category', async () => {
    window.showQuickPick = vi.fn().mockReturnValue(new Promise(() => { }))
    const k = new Kernel({} as any)
    k.setCategory('shell scripts')
    k['_doExecuteCell'] = vi.fn()
    await k['_executeAll'](getCells(10).slice(0, 5))
    expect(k['_doExecuteCell']).toBeCalledTimes(0)
    expect(TelemetryReporter.sendTelemetryEvent).lastCalledWith(
      'cells.executeAll',
      { 'cells.executed': '0', 'cells.total': '10' }
    )
  })

  test('does runs cells for specific cell category', async () => {
    window.showQuickPick = vi.fn().mockReturnValue(new Promise(() => { }))
    const k = new Kernel({} as any)
    k.setCategory('shell scripts')
    k['_doExecuteCell'] = vi.fn()
    const cellsFromCategory = getCells(2, { category: 'shell scripts' }).concat(getCells(5))
    await k['_executeAll'](cellsFromCategory)
    expect(k['_doExecuteCell']).toBeCalledTimes(2)
    expect(TelemetryReporter.sendTelemetryEvent).lastCalledWith(
      'cells.executeAll',
      { 'cells.executed': '2', 'cells.total': '10' }
    )
  })

  test('does runs cells for specific cell category and skip cells with excludeFromRunAll', async () => {
    window.showQuickPick = vi.fn().mockReturnValue(new Promise(() => { }))
    const k = new Kernel({} as any)
    k.setCategory('shell scripts')
    k['_doExecuteCell'] = vi.fn()
    const cellsFromCategory = getCells(2, { category: 'shell scripts', excludeFromRunAll: true })
      .concat(getCells(1, { category: 'shell scripts' }))
      .concat(getCells(1))
    await k['_executeAll'](cellsFromCategory)
    expect(k['_doExecuteCell']).toBeCalledTimes(1)
    expect(TelemetryReporter.sendTelemetryEvent).lastCalledWith(
      'cells.executeAll',
      { 'cells.executed': '1', 'cells.total': '10' }
    )
  })
})



test('_doExecuteCell', async () => {
  const k = new Kernel({} as any)

  k.createCellExecution = vi.fn().mockResolvedValue({
    start: vi.fn(),
    end: vi.fn(),
    underlyingExecution: vi.fn(),
  })
  k.getCellOutputs = vi.fn().mockResolvedValue({})

  await k['_doExecuteCell']({
    document: { uri: { fsPath: '/foo/bar' } },
    metadata: { 'runme.dev/uuid': '849448b2-3c41-4323-920e-3098e71302ce' }
  } as any)
  // @ts-expect-error mocked out
  expect(executors.foobar).toBeCalledTimes(1)
  expect(TelemetryReporter.sendTelemetryEvent).toHaveBeenCalledWith(
    'cell.startExecute'
  )
  expect(TelemetryReporter.sendTelemetryEvent).toHaveBeenCalledWith(
    'cell.endExecute',
    { success: undefined }
  )
})
