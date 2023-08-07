import {
  NotebookCell,
  NotebookCellStatusBarItemProvider,
  NotebookCellStatusBarItem,
  NotebookCellStatusBarAlignment,
  NotebookCellKind,
} from 'vscode'

import { OutputType } from '../../constants'
import { RunmeExtension } from '../extension'
import { Kernel } from '../kernel'

export class AnnotationsProvider implements NotebookCellStatusBarItemProvider {
  constructor(private readonly kernel: Kernel) {
    RunmeExtension.registerCommand(
      'runme.toggleCellAnnotations',
      this.toggleCellAnnotations.bind(this),
    )
  }

  public async toggleCellAnnotations(cell: NotebookCell): Promise<void> {
    const outputs = await this.kernel.getCellOutputs(cell)
    await outputs.toggleOutput(OutputType.annotations)
  }

  async provideCellStatusBarItems(
    cell: NotebookCell,
  ): Promise<NotebookCellStatusBarItem | undefined> {
    if (cell.kind !== NotebookCellKind.Code) {
      return
    }

    const item = new NotebookCellStatusBarItem(
      '$(gear) Configure',
      NotebookCellStatusBarAlignment.Right,
    )

    item.command = {
      title: 'Configure cell behavior',
      command: 'runme.toggleCellAnnotations',
      arguments: [cell],
    }

    item.tooltip = 'Click to configure cell behavior'
    return item
  }
}
