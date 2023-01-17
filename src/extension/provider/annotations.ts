import {
  window,
  commands,
  NotebookCell,
  NotebookCellOutput,
  NotebookCellOutputItem,
  NotebookCellStatusBarItemProvider,
  NotebookCellStatusBarItem,
  NotebookCellStatusBarAlignment,
} from 'vscode'

import { OutputType } from '../../constants'
import { CellOutputPayload } from '../../types'
import { Kernel } from '../kernel'
import { getAnnotations } from '../utils'

export class AnnotationsProvider implements NotebookCellStatusBarItemProvider {
  constructor(private readonly kernel: Kernel) {
    commands.registerCommand(
      'runme.openCellAnnotations',
      async (cell: NotebookCell) => {
        try {
          const exec = await kernel.createCellExecution(cell)
          exec.start(Date.now())
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
          exec.end(true)
        } catch (e: any) {
          window.showErrorMessage(e.message)
        }
      }
    )
  }

  async provideCellStatusBarItems(
    cell: NotebookCell
  ): Promise<NotebookCellStatusBarItem | undefined> {
    if (!this.kernel.hasAnnotationsEditExperimentEnabled) {
      return
    }

    const item = new NotebookCellStatusBarItem(
      '$(output-view-icon) Annotations',
      NotebookCellStatusBarAlignment.Right
    )

    item.command = {
      title: 'Edit cell annotations',
      command: 'runme.openCellAnnotations',
      arguments: [cell],
    }
    return item
  }
}
