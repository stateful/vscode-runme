import {
  NotebookCell,
  NotebookCellStatusBarItemProvider,
  NotebookCellStatusBarItem,
  NotebookCellStatusBarAlignment,
  NotebookCellKind,
} from 'vscode'

import { getAnnotations } from '../utils'

export class NamedProvider implements NotebookCellStatusBarItemProvider {
  async provideCellStatusBarItems(
    cell: NotebookCell,
  ): Promise<NotebookCellStatusBarItem | undefined> {
    if (cell.kind !== NotebookCellKind.Code) {
      return
    }

    const annotations = getAnnotations(cell)

    let item: NotebookCellStatusBarItem
    const text = '$(add) Add Name'
    item = new NotebookCellStatusBarItem(text, NotebookCellStatusBarAlignment.Left)
    item.text = text
    item.tooltip = 'Add name to important cells'

    const specificName =
      annotations['runme.dev/nameGenerated'] !== true ||
      annotations.name !== annotations['runme.dev/name']

    if (annotations.name.length > 0 && specificName) {
      item.tooltip = 'Be careful changing the name of an important cell'
      item.text = `$(file-symlink-file) ${annotations.name}`
    }

    item.command = {
      title: 'Configure cell behavior',
      command: 'runme.toggleCellAnnotations',
      arguments: [cell],
    }

    return item
  }
}
