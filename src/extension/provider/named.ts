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

  // public async toggleCellAnnotations(cell: NotebookCell): Promise<void> {
  //   const outputs = await this.kernel.getCellOutputs(cell)
  //   await outputs.toggleOutput(OutputType.annotations)
  // }

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

    if (
      annotations['runme.dev/nameGenerated'] &&
      annotations.name === annotations['runme.dev/name']
    ) {
      item.text = '$(add) Add Name'
    }

    item.command = {
      title: 'Configure cell behavior',
      command: 'runme.toggleCellAnnotations',
      arguments: [cell],
    }

    item.tooltip = 'Change name'
    return item
  }
}
