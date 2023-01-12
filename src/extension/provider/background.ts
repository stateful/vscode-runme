import vscode from 'vscode'

import { getAnnotations, getTerminalByCell } from '../utils'

export class ShowTerminalProvider implements vscode.NotebookCellStatusBarItemProvider {
  async provideCellStatusBarItems(cell: vscode.NotebookCell): Promise<vscode.NotebookCellStatusBarItem | undefined> {
    /**
     * don't show status item if we run it in non-interactive mode where there is no terminal to open
     */
    if (!getAnnotations(cell).interactive) {
      return
    }

    const terminal = getTerminalByCell(cell)
    const pid = await terminal?.processId

    if (!Boolean(terminal) || !pid) {
      return
    }

    const item = new vscode.NotebookCellStatusBarItem(
      `$(terminal) Open Terminal (PID: ${pid})`,
      vscode.NotebookCellStatusBarAlignment.Right
    )
    item.command = 'runme.openTerminal'
    return item
  }
}

export class BackgroundTaskProvider implements vscode.NotebookCellStatusBarItemProvider {
  provideCellStatusBarItems(cell: vscode.NotebookCell): vscode.NotebookCellStatusBarItem | undefined {
    const annotations = getAnnotations(cell)

    /**
     * don't show if not a background task
     */
    if (!annotations.background || !annotations.interactive) {
      return
    }

    const item = new vscode.NotebookCellStatusBarItem(
      'Background Task',
      vscode.NotebookCellStatusBarAlignment.Right
    )
    return item
  }
}
export class StopBackgroundTaskProvider implements vscode.NotebookCellStatusBarItemProvider {
  provideCellStatusBarItems(cell: vscode.NotebookCell): vscode.NotebookCellStatusBarItem | undefined {
    const annotations = getAnnotations(cell)

    /**
     * don't show if not a background task & if not command currently running
     */
    if (!annotations.background || !annotations.interactive || !cell.executionSummary?.success) {
      return
    }

    const item = new vscode.NotebookCellStatusBarItem(
      '$(circle-slash) Stop Task',
      vscode.NotebookCellStatusBarAlignment.Right
    )
    item.command = 'runme.stopBackgroundTask'
    return item
  }
}
