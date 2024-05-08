import { NotebookCell, NotebookCellStatusBarAlignment, NotebookCellStatusBarItem } from 'vscode'

import CellStatusBarItem from './cellStatusBarItem'

export class GitHubGistStatusBarItem extends CellStatusBarItem {
  getStatusBarItem(cell: NotebookCell): NotebookCellStatusBarItem | undefined {
    const item = new NotebookCellStatusBarItem(
      '$(github) Generate Gist',
      NotebookCellStatusBarAlignment.Right,
    )
    item.command = {
      command: 'runme.cellGistShare',
      title: 'Click to generate GitHub gist link',
      arguments: [cell],
    }
    return item
  }

  registerCommands(): void {}
}
