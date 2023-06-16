import vscode, { NotebookCellKind } from 'vscode'

import { getAnnotations } from '../utils'

export class CliProvider implements vscode.NotebookCellStatusBarItemProvider {
  async provideCellStatusBarItems(cell: vscode.NotebookCell): Promise<vscode.NotebookCellStatusBarItem | undefined> {
    if (cell.kind !== NotebookCellKind.Code) {
      return
    }

    /**
     * only show CLI if runme.dev/name is known
     */
    const annotations = getAnnotations(cell)
    if (!annotations.name) {
      return
    }

    const item = new vscode.NotebookCellStatusBarItem(
      '$(github-action) CLI',
      vscode.NotebookCellStatusBarAlignment.Right
    )
    item.command = 'runme.runCliCommand'
    return item
  }
}
