import { NotebookCell, NotebookCellStatusBarAlignment, NotebookCellStatusBarItem } from 'vscode'

import { OutputType } from '../../../../constants'
import { RunmeExtension } from '../../../extension'

import CellStatusBarItem from './cellStatusBarItem'

export class AnnotationsStatusBarItem extends CellStatusBarItem {
  registerCommands(): void {
    RunmeExtension.registerCommand(
      'runme.toggleCellAnnotations',
      this.toggleCellAnnotations.bind(this),
    )
  }

  public async toggleCellAnnotations(cell: NotebookCell): Promise<void> {
    const outputs = await this.kernel.getCellOutputs(cell)
    await outputs.toggleOutput(OutputType.annotations)
  }

  getStatusBarItem(cell: NotebookCell): NotebookCellStatusBarItem {
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
