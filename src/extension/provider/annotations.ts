import {
  commands,
  window,
  NotebookCell,
  NotebookCellOutput,
  NotebookCellOutputItem,
  NotebookCellStatusBarItemProvider,
  NotebookCellStatusBarItem,
  NotebookCellStatusBarAlignment,
  NotebookCellKind,
} from 'vscode'

import { OutputType } from '../../constants'
import { CellOutputPayload } from '../../types'
import { RunmeExtension } from '../extension'
import { Kernel } from '../kernel'
import { getAnnotations, replaceOutput, validateAnnotations } from '../utils'

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
    const annotationsExists = cell.outputs.find((o) =>
      o.items.find((oi) => oi.mime === OutputType.annotations)
    )

    let exec
    try {
      exec = await this.kernel.createCellExecution(cell)
      exec.start(Date.now())

      if (annotationsExists) {
        exec.clearOutput()
        return
      }

      const json = <CellOutputPayload<OutputType.annotations>>{
        type: OutputType.annotations,
        output: {
          annotations: getAnnotations(cell),
          validationErrors: validateAnnotations(cell)
        },
      }
      await replaceOutput(exec, [
        new NotebookCellOutput([
          NotebookCellOutputItem.json(json, OutputType.annotations),
          NotebookCellOutputItem.json(json),
        ]),
      ])
    } catch (e: any) {
      if (e.message.toString().includes('controller is NOT associated')) {
        return this.handleNotebookKernelSelection()
      }
      window.showErrorMessage(e.message)
    } finally {
      exec?.end(true)
    }
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
