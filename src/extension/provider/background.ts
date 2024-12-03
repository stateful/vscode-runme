import type vscode from 'vscode'
import {
  window,
  EventEmitter,
  NotebookCellStatusBarItem,
  NotebookCellStatusBarAlignment,
  tasks,
} from 'vscode'

import { getAnnotations, getTerminalByCell } from '../utils'
import { Kernel } from '../kernel'

export class ToggleTerminalProvider
  implements vscode.NotebookCellStatusBarItemProvider, vscode.Disposable
{
  private _onDidChangeCellStatusBarItems = new EventEmitter<void>()
  onDidChangeCellStatusBarItems = this._onDidChangeCellStatusBarItems.event

  protected disposables: vscode.Disposable[] = [this._onDidChangeCellStatusBarItems]

  constructor(protected kernel: Kernel) {
    this.disposables.push(
      window.onDidCloseTerminal(this.refreshStatusBarItems.bind(this)),
      tasks.onDidStartTaskProcess(this.refreshStatusBarItems.bind(this)),
      tasks.onDidEndTaskProcess(this.refreshStatusBarItems.bind(this)),
    )
  }

  async provideCellStatusBarItems(
    cell: vscode.NotebookCell,
  ): Promise<vscode.NotebookCellStatusBarItem | undefined> {
    const terminalState = await this.kernel.getTerminalState(cell)

    if (!terminalState) {
      return
    }

    const terminalButtonParts = ['$(terminal)', 'Terminal']

    const item = new NotebookCellStatusBarItem(
      terminalButtonParts.join(' '),
      NotebookCellStatusBarAlignment.Right,
    )
    item.command = 'runme.toggleTerminal'

    const { interactive } = getAnnotations(cell)
    if (!interactive) {
      const terminal = getTerminalByCell(cell)
      if (!terminal) {
        return undefined
      }
      item.command = 'runme.openIntegratedTerminal'
    }

    return item
  }

  refreshStatusBarItems() {
    this._onDidChangeCellStatusBarItems.fire()
  }

  public dispose() {
    this.disposables.forEach(({ dispose }) => dispose())
  }
}

export class BackgroundTaskProvider implements vscode.NotebookCellStatusBarItemProvider {
  async provideCellStatusBarItems(
    cell: vscode.NotebookCell,
  ): Promise<vscode.NotebookCellStatusBarItem | undefined> {
    const annotations = getAnnotations(cell)

    const terminal = getTerminalByCell(cell)
    const pid = await terminal?.processId

    let text = 'Background Task'

    if (pid !== undefined && pid > -1) {
      text = `PID: ${pid}`
    }

    /**
     * don't show if not a background task
     */
    if (!annotations.background || !annotations.interactive) {
      return
    }

    const item = new NotebookCellStatusBarItem(text, NotebookCellStatusBarAlignment.Right)

    if (terminal) {
      item.command = 'runme.openIntegratedTerminal'
    }

    return item
  }
}
export class StopBackgroundTaskProvider
  implements vscode.NotebookCellStatusBarItemProvider, vscode.Disposable
{
  private _onDidChangeCellStatusBarItems = new EventEmitter<void>()
  onDidChangeCellStatusBarItems = this._onDidChangeCellStatusBarItems.event

  protected disposables: vscode.Disposable[] = []

  constructor() {
    this.disposables.push(
      tasks.onDidEndTaskProcess(() => {
        this._onDidChangeCellStatusBarItems.fire()
      }),
    )

    this.disposables.push(
      window.onDidCloseTerminal(() => {
        this._onDidChangeCellStatusBarItems.fire()
      }),
    )
  }

  provideCellStatusBarItems(
    cell: vscode.NotebookCell,
  ): vscode.NotebookCellStatusBarItem | undefined {
    const annotations = getAnnotations(cell)

    /**
     * don't show if not a background task & if not command currently running
     */
    if (!annotations.background || !annotations.interactive) {
      return
    }

    const terminal = getTerminalByCell(cell)

    if (!terminal || terminal.runnerSession?.hasExited() !== undefined) {
      return
    }

    const item = new NotebookCellStatusBarItem(
      '$(circle-slash) Stop Task',
      NotebookCellStatusBarAlignment.Right,
    )
    item.command = 'runme.stopBackgroundTask'
    return item
  }

  dispose() {
    this.disposables.forEach(({ dispose }) => dispose())
  }
}
