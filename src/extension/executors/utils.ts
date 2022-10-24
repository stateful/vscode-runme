import { NotebookCellOutput, NotebookCellExecution, NotebookCellOutputItem } from 'vscode'

import { OutputType } from '../../constants'
import type { CellOutput } from '../../types'

export function renderError (exec: NotebookCellExecution, output: string) {
  return exec.replaceOutput(new NotebookCellOutput([
    NotebookCellOutputItem.json(
      <CellOutput<OutputType.error>>{
        type: OutputType.error,
        output
      },
      OutputType.error
    )
  ]))
}
