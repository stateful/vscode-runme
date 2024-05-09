import { NotebookCell, NotebookCellStatusBarAlignment, NotebookCellStatusBarItem } from 'vscode'

import { insertCodeNotebookCell } from '../../../cell'
import { RunmeExtension } from '../../../extension'
import { getAnnotations, isValidEnvVarName } from '../../../utils'

import CellStatusBarItem from './cellStatusBarItem'

export class NamedStatusBarItem extends CellStatusBarItem {
  public async addEnvironmentExecution(cell: NotebookCell, variableName: string): Promise<void> {
    return insertCodeNotebookCell(cell, `echo $${variableName}`)
  }

  registerCommands(): void {
    RunmeExtension.registerCommand(
      'runme.addEnvironmentVariableExecution',
      this.addEnvironmentExecution.bind(this),
    )
  }

  getStatusBarItem(cell: NotebookCell): NotebookCellStatusBarItem {
    const annotations = getAnnotations(cell)

    let item: NotebookCellStatusBarItem
    const text = '$(add) Add Name'
    item = new NotebookCellStatusBarItem(text, NotebookCellStatusBarAlignment.Left)
    item.text = text
    item.tooltip = 'Set an environment variable to reference the cell output in another cell'

    const specificName =
      annotations['runme.dev/nameGenerated'] !== true ||
      annotations.name !== annotations['runme.dev/name']

    if (annotations.name.length > 0 && specificName) {
      const isValid = isValidEnvVarName(annotations.name)
      if (!isValid) {
        item.tooltip =
          "The environment variable is invalid; cell output won't export, click here to configure it properly"
        item.text = `$(edit) ${annotations.name}`
        item.command = {
          title: 'Configure cell behavior',
          command: 'runme.toggleCellAnnotations',
          arguments: [cell, annotations.name],
        }
      } else {
        item.tooltip = 'Click to run an example cell with the exported variable name'
        item.text = `$(file-symlink-file) ${annotations.name}`
        item.command = {
          title: 'Add cell execution for the defined environment variable',
          command: 'runme.addEnvironmentVariableExecution',
          arguments: [cell, annotations.name],
        }
      }
    } else {
      item.command = {
        title: 'Configure cell behavior',
        command: 'runme.toggleCellAnnotations',
        arguments: [cell, annotations.name],
      }
    }

    return item
  }
}
