import { NotebookCell, NotebookCellStatusBarAlignment, NotebookCellStatusBarItem } from 'vscode'

import CellStatusBarItem from './cellStatusBarItem'

export class ForkStatusBarItem extends CellStatusBarItem {
  getStatusBarItem(_cell: NotebookCell): NotebookCellStatusBarItem | undefined {
    const item = new NotebookCellStatusBarItem(
      '$(github-action) Fork ENV',
      NotebookCellStatusBarAlignment.Right,
    )
    item.command = 'runme.runForkCommand'
    return item
  }
  registerCommands(): void {}
}
