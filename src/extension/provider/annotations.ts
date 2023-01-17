import vscode, { NotebookCell } from 'vscode'

import { OutputType } from '../../constants'
import { CellOutputPayload } from '../../types'
import { RunmeKernel } from '../kernel'
import { getAnnotations } from '../utils'


export class AnnotationsProvider implements vscode.NotebookCellStatusBarItemProvider {
  readonly #hasAnnotationsEditExperimentEnabled: boolean
  constructor(private readonly runmeKernel: RunmeKernel) {
    const config = vscode.workspace.getConfiguration('runme.experiments')
    this.#hasAnnotationsEditExperimentEnabled = config.get<boolean>('annotationsEdit', false)
    vscode.commands.registerCommand('runme.openCellAnnotations', async (cell: NotebookCell) => {
      try {
        const exec = await runmeKernel.createCellExecution(cell)
        exec.start(Date.now())
        const json = <CellOutputPayload<OutputType.annotations>>{
          type: OutputType.annotations,
          output: {
            annotations: getAnnotations(cell),
          },
        }
        await exec.replaceOutput([
          new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.json(json, OutputType.annotations),
            vscode.NotebookCellOutputItem.json(json),
          ]),
        ])
        exec.end(true)
      } catch (e: any) {
        vscode.window.showErrorMessage(e.message)
      }
    })
  }

  async provideCellStatusBarItems(cell: vscode.NotebookCell): Promise<vscode.NotebookCellStatusBarItem | undefined> {
    if (!this.#hasAnnotationsEditExperimentEnabled) {
      return
    }

    const item = new vscode.NotebookCellStatusBarItem(
      '$(output-view-icon) Annotations',
      vscode.NotebookCellStatusBarAlignment.Right
    )

    item.command = {
      title: 'Edit cell annotations',
      command: 'runme.openCellAnnotations',
      arguments: [cell],
    }
    return item
  }
}
