import { window } from 'vscode'
import { vi, describe, expect, beforeEach, it } from 'vitest'

import { getAnnotations, getTerminalByCell } from '../../../src/extension/utils'
import {
  ShowTerminalProvider,
  BackgroundTaskProvider,
  StopBackgroundTaskProvider
} from '../../../src/extension/provider/background'

vi.mock('vscode')
vi.mock('../../../src/extension/utils', async () => {
  return ({
    getTerminalByCell: vi.fn(),
    getAnnotations: vi.fn()
  })
})

describe('ShowTerminalProvider', () => {
  beforeEach(() => {
    vi.mocked(getTerminalByCell).mockClear()
    vi.mocked(getAnnotations).mockClear()
  })

  it('dont show pid if cell is non interactive', async () => {
    vi.mocked(getAnnotations).mockReturnValueOnce({ interactive: false } as any)
    const p = new ShowTerminalProvider()
    expect(await p.provideCellStatusBarItems('cell' as any)).toBe(undefined)
    expect(getAnnotations).toBeCalledTimes(1)
    expect(getTerminalByCell).toBeCalledTimes(0)
    expect(getAnnotations).toBeCalledWith('cell')
  })

  it('dont show pid if terminal could not be found', async () => {
    vi.mocked(getAnnotations).mockReturnValueOnce({ interactive: true } as any)
    vi.mocked(getTerminalByCell).mockReturnValueOnce(undefined)
    const p = new ShowTerminalProvider()
    expect(await p.provideCellStatusBarItems('cell' as any)).toBe(undefined)
    expect(getTerminalByCell).toBeCalledTimes(1)
    expect(getTerminalByCell).toBeCalledWith('cell')
  })

  it('return status item with pid ', async () => {
    vi.mocked(getAnnotations).mockReturnValueOnce({ interactive: true } as any)
    vi.mocked(getTerminalByCell).mockReturnValueOnce({ processId: Promise.resolve(123) } as any)
    const p = new ShowTerminalProvider()
    const item = await p.provideCellStatusBarItems('cell' as any)
    expect(item).toEqual({
      label: '$(terminal) Open Terminal (PID: 123)',
      command: 'runme.openTerminal',
      alignment: 2
    })
  })

  it('will stop showing pid if terminal is destroyed', async () => {
    let changeActiveTerminal: (() => void)[] = []
    vi.mocked<any>(window.onDidCloseTerminal).mockImplementationOnce(c => changeActiveTerminal.push(c))

    vi.mocked(getAnnotations).mockReturnValueOnce({ interactive: true } as any)
    vi.mocked(getTerminalByCell).mockReturnValueOnce({ processId: Promise.resolve(123) } as any)
    const p = new ShowTerminalProvider()
    p.refreshStatusBarItems = vi.fn()
    const item = await p.provideCellStatusBarItems('cell' as any)
    expect(item).toBeTruthy()

    changeActiveTerminal.forEach((c) => c())
    expect(p.refreshStatusBarItems).toBeCalledTimes(1)

    vi.mocked(getAnnotations).mockReturnValueOnce({ interactive: true } as any)
    vi.mocked(getTerminalByCell).mockReturnValueOnce(undefined)
    {
      const p = new ShowTerminalProvider()
      expect(await p.provideCellStatusBarItems('cell' as any)).toBe(undefined)
    }
  })
})

describe('BackgroundTaskProvider', () => {
  const cell: any = {
    metadata: { background: undefined }
  }

  beforeEach(() => {
    vi.mocked(getTerminalByCell).mockClear()
    vi.mocked(getAnnotations).mockClear()
  })

  it('dont show bg task label if cell is non a background task', async () => {
    vi.mocked(getAnnotations).mockReturnValue({ background: false } as any)
    const p = new BackgroundTaskProvider()
    expect(await p.provideCellStatusBarItems(cell as any)).toBe(undefined)
    expect(getAnnotations).toBeCalledTimes(1)
  })

  it('dont show bg task label if cell is non interactive', async () => {
    cell.metadata.background = 'true'
    cell.metadata.interactive = false
    vi.mocked(getAnnotations).mockReturnValue(cell.metadata)
    const p = new BackgroundTaskProvider()
    expect(await p.provideCellStatusBarItems(cell as any)).toBe(undefined)
    expect(getAnnotations).toBeCalledTimes(1)
    expect(getAnnotations).toBeCalledWith(cell)
  })

  it('return status item with pid ', async () => {
    vi.mocked(getAnnotations).mockReturnValueOnce({
      interactive: true,
      background: true
    } as any)
    const p = new BackgroundTaskProvider()
    const item = await p.provideCellStatusBarItems(cell as any)
    expect(item).toEqual({
      label: 'Background Task',
      alignment: 2
    })
  })
})

describe('StopBackgroundTaskProvider', () => {
  const cell: any = {
    metadata: { background: undefined },
    executionSummary: { success: undefined }
  }

  beforeEach(() => {
    vi.mocked(getTerminalByCell).mockClear()
    vi.mocked(getAnnotations).mockClear()
  })

  it('dont show bg task label if cell is non a background task', async () => {
    vi.mocked(getAnnotations).mockReturnValue(cell.metadata)
    const p = new StopBackgroundTaskProvider()
    expect(await p.provideCellStatusBarItems(cell as any)).toBe(undefined)
  })

  it('dont show bg task label if cell is non interactive', async () => {
    cell.metadata.background = 'true'
    vi.mocked(getAnnotations).mockReturnValueOnce({ interactive: false } as any)
    const p = new StopBackgroundTaskProvider()
    expect(await p.provideCellStatusBarItems(cell as any)).toBe(undefined)
  })

  it('dont show if cell was not yet executed', async () => {
    cell.metadata.background = 'true'
    cell.executionSummary.success = false
    vi.mocked(getAnnotations).mockReturnValueOnce({
      background: 'true'
    } as any)
    const p = new StopBackgroundTaskProvider()
    expect(await p.provideCellStatusBarItems(cell as any)).toBe(undefined)
    expect(cell.executionSummary.success).toBe(false)
  })

  it('return with button to close', async () => {
    cell.metadata.background = 'true'
    cell.executionSummary.success = true
    vi.mocked(getAnnotations).mockReturnValueOnce({
      interactive: true,
      background: 'true'
    } as any)
    const p = new StopBackgroundTaskProvider()
    const item = await p.provideCellStatusBarItems(cell)
    expect(item).toEqual({
      label: '$(circle-slash) Stop Task',
      alignment: 2,
      command: 'runme.stopBackgroundTask'
    })
  })
})
