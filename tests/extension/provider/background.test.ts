import { vi, describe, expect, beforeEach, it } from 'vitest'

import { getAnnotations, getTerminalByCell } from '../../../src/extension/utils'
import {
  ToggleTerminalProvider,
  BackgroundTaskProvider,
  StopBackgroundTaskProvider,
} from '../../../src/extension/provider/background'

vi.mock('vscode')

vi.mock('../../../src/extension/utils', async () => {
  return {
    getTerminalByCell: vi.fn(),
    getAnnotations: vi.fn(),
  }
})

describe('ShowTerminalProvider', () => {
  beforeEach(() => {
    vi.mocked(getTerminalByCell).mockReset()
    vi.mocked(getAnnotations).mockReset()
  })

  it('dont show if no terminal state', async () => {
    const kernel = {
      getTerminalState: vi.fn().mockResolvedValue(undefined),
    } as any

    const p = new ToggleTerminalProvider(kernel)

    expect(await p.provideCellStatusBarItems({} as any)).toBe(undefined)
  })

  it('show if no terminal state', async () => {
    const kernel = {
      getTerminalState: vi.fn().mockResolvedValue({}),
    } as any

    const p = new ToggleTerminalProvider(kernel)

    expect(await p.provideCellStatusBarItems({} as any)).toEqual({
      alignment: 2,
      command: 'runme.toggleTerminal',
      label: '$(terminal) Terminal',
    })
  })
})

describe('BackgroundTaskProvider', () => {
  const cell: any = {
    metadata: { background: undefined },
  }

  beforeEach(() => {
    vi.mocked(getTerminalByCell).mockReset()
    vi.mocked(getAnnotations).mockReset()
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
      background: true,
    } as any)
    vi.mocked(getTerminalByCell).mockReturnValueOnce({
      processId: 123,
    } as any)
    const p = new BackgroundTaskProvider()
    const item = await p.provideCellStatusBarItems(cell as any)
    expect(item).toEqual({
      label: 'PID: 123',
      alignment: 2,
      command: 'runme.openIntegratedTerminal',
    })
  })
})

describe('StopBackgroundTaskProvider', () => {
  const cell: any = {
    metadata: { background: undefined },
    executionSummary: { success: undefined },
  }

  beforeEach(() => {
    vi.mocked(getTerminalByCell).mockReset()
    vi.mocked(getAnnotations).mockReset()
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
    vi.mocked(getTerminalByCell).mockReturnValueOnce(undefined)
    vi.mocked(getAnnotations).mockReturnValueOnce({
      background: true,
      interactive: true,
    } as any)
    const p = new StopBackgroundTaskProvider()
    expect(await p.provideCellStatusBarItems(cell as any)).toBe(undefined)
    expect(getAnnotations).toHaveBeenCalledOnce()
    expect(getTerminalByCell).toHaveBeenCalledOnce()
  })

  it('dont show if cell has not finished executing', async () => {
    cell.metadata.background = 'true'
    vi.mocked(getTerminalByCell).mockReturnValueOnce({
      runnerSession: {
        hasExited: () => ({}),
      },
    } as any)
    vi.mocked(getAnnotations).mockReturnValueOnce({
      background: true,
      interactive: true,
    } as any)
    const p = new StopBackgroundTaskProvider()
    expect(await p.provideCellStatusBarItems(cell as any)).toBe(undefined)

    expect(getAnnotations).toHaveBeenCalledOnce()
    expect(getTerminalByCell).toHaveBeenCalledOnce()
  })

  it('return with button to close', async () => {
    cell.metadata.background = 'true'
    vi.mocked(getTerminalByCell).mockReturnValueOnce({
      runnerSession: {
        hasExited: () => undefined,
      },
    } as any)
    vi.mocked(getAnnotations).mockReturnValueOnce({
      interactive: true,
      background: true,
    } as any)
    const p = new StopBackgroundTaskProvider()
    const item = await p.provideCellStatusBarItems(cell)
    expect(item).toEqual({
      label: '$(circle-slash) Stop Task',
      alignment: 2,
      command: 'runme.stopBackgroundTask',
    })
    expect(getAnnotations).toHaveBeenCalledOnce()
    expect(getTerminalByCell).toHaveBeenCalledOnce()
  })
})
