import { NotebookCell, NotebookCellStatusBarAlignment, NotebookCellStatusBarItem } from 'vscode'

import { getAnnotations } from '../../../utils'

import CellStatusBarItem from './cellStatusBarItem'

export class CLIStatusBarItem extends CellStatusBarItem {
  getStatusBarItem(cell: NotebookCell): NotebookCellStatusBarItem | undefined {
    /**
     * only show Fork if runme.dev/name is known
     */
    const annotations = getAnnotations(cell)
    if (!annotations.name) {
      return
    }

    const item = new NotebookCellStatusBarItem(
      '$(github-action) Fork ENV',
      NotebookCellStatusBarAlignment.Right,
    )
    item.command = 'runme.runCliCommand'
    return item
  }
  registerCommands(): void {}
}
