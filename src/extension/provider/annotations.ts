import {
  commands,
  window,
  NotebookCell,
  NotebookCellStatusBarItemProvider,
  NotebookCellStatusBarItem,
  NotebookCellStatusBarAlignment,
  NotebookCellKind,
} from 'vscode'

import { OutputType } from '../../constants'
import { RunmeExtension } from '../extension'
import { Kernel } from '../kernel'

const NOTEBOOK_SELECTION_COMMAND = '_notebook.selectKernel'

export class AnnotationsProvider implements NotebookCellStatusBarItemProvider {
  // cmd may go away https://github.com/microsoft/vscode/issues/126534#issuecomment-864053106
  readonly selectionCommandAvailable = commands
    .getCommands()
    .then(cmds => cmds.includes(NOTEBOOK_SELECTION_COMMAND))

  constructor(private readonly kernel: Kernel) {
    RunmeExtension.registerCommand(
      'runme.toggleCellAnnotations',
      this.toggleCellAnnotations.bind(this)
    )
  }

  private async handleNotebookKernelSelection() {
    if (!(await this.selectionCommandAvailable)) {
      window.showWarningMessage(
        'Please select a kernel (top right: "Select Kernel") to continue.')
      return
    }
    return window.showInformationMessage(
      'Please select a notebook kernel first to continue.',
      'Select Kernel'
    ).then(option => {
      if (!option) {
        return
      }
      commands.executeCommand(NOTEBOOK_SELECTION_COMMAND)
    })
  }

  public async toggleCellAnnotations(cell: NotebookCell): Promise<void> {
    const outputs = await this.kernel.getCellOutputs(cell)
    await outputs.toggleOutput(OutputType.annotations)
  }

  async provideCellStatusBarItems(
    cell: NotebookCell
  ): Promise<NotebookCellStatusBarItem | undefined> {
    if (cell.kind !== NotebookCellKind.Code) {
      return
    }

    const item = new NotebookCellStatusBarItem(
      '$(gear) Configure',
      NotebookCellStatusBarAlignment.Right
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
