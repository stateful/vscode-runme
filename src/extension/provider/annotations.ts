import {
  window,
  commands,
  NotebookCell,
  NotebookCellOutput,
  NotebookCellOutputItem,
  NotebookCellStatusBarItemProvider,
  NotebookCellStatusBarItem,
  NotebookCellStatusBarAlignment,
  NotebookCellExecution,
} from 'vscode'

import { OutputType } from '../../constants'
import { CellOutputPayload } from '../../types'
import { Kernel } from '../kernel'
import { getAnnotations } from '../utils'

export class AnnotationsProvider implements NotebookCellStatusBarItemProvider {
  constructor(private readonly kernel: Kernel) {
    commands.registerCommand(
      'runme.toggleCellAnnotations',
      this.toggleCellAnnotations.bind(this)
    )
  }

  protected async toggleCellAnnotations(cell: NotebookCell): Promise<void> {
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
        },
      }
      await exec.replaceOutput([
        new NotebookCellOutput([
          NotebookCellOutputItem.json(json, OutputType.annotations),
          NotebookCellOutputItem.json(json),
        ]),
      ])
    } catch (e: any) {
      window.showErrorMessage(e.message)
    } finally {
      exec?.end(true)
    }
  }

  async provideCellStatusBarItems(
    cell: NotebookCell
  ): Promise<NotebookCellStatusBarItem | undefined> {
    if (!this.kernel.hasAnnotationsEditExperimentEnabled) {
      return
    }

    const item = new NotebookCellStatusBarItem(
      '$(gear) Configure',
      NotebookCellStatusBarAlignment.Right
    )

    item.command = {
      title: 'Edit cell annotations',
      command: 'runme.toggleCellAnnotations',
      arguments: [cell],
    }

    item.tooltip = 'Click to view/set annotations'
    return item
  }
}
