import { NotebookCellStatusBarAlignment, NotebookCellStatusBarItem } from 'vscode'

import CellStatusBarItem from './cellStatusBarItem'

export class CopyStatusBarItem extends CellStatusBarItem {
  getStatusBarItem(): NotebookCellStatusBarItem {
    const item = new NotebookCellStatusBarItem('$(copy) Copy', NotebookCellStatusBarAlignment.Right)
    item.command = 'runme.copyCellToClipboard'
    return item
  }
  registerCommands(): void {}
}
