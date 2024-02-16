import {
  NotebookCell,
  NotebookCellStatusBarItemProvider,
  NotebookCellStatusBarItem,
  NotebookCellStatusBarAlignment,
  NotebookCellKind,
} from 'vscode'

import { Kernel } from '../kernel'
import { getAnnotations } from '../utils'

export class NamedProvider implements NotebookCellStatusBarItemProvider {
  constructor(private readonly kernel: Kernel) {}

  async provideCellStatusBarItems(
    cell: NotebookCell,
  ): Promise<NotebookCellStatusBarItem | undefined> {
    if (cell.kind !== NotebookCellKind.Code) {
      return
    }

    const annotations = getAnnotations(cell)

    let item: NotebookCellStatusBarItem
    item = new NotebookCellStatusBarItem(
      `$(file-symlink-file) ${annotations.name}`,
      NotebookCellStatusBarAlignment.Left,
    )
    item.tooltip = 'Change cell name'

    if (
      annotations['runme.dev/nameGenerated'] &&
      annotations.name === annotations['runme.dev/name']
    ) {
      item.text = '$(add) Add Name'
      item.tooltip = 'Add name to important cells'
    }

    item.command = {
      title: 'Configure cell behavior',
      command: 'runme.toggleCellAnnotations',
      arguments: [cell],
    }

    return item
  }
}
