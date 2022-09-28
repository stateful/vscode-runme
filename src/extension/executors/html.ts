import { TextDocument, NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution } from 'vscode'

import { OutputType } from '../../constants'
import type { CellOutput } from '../../types'

async function htmlExecutor(
  exec: NotebookCellExecution,
  doc: TextDocument
): Promise<boolean> {
  exec.replaceOutput(new NotebookCellOutput([
    NotebookCellOutputItem.json(<CellOutput>{
      type: OutputType.html,
      output: doc.getText()
    }, OutputType.html)
  ]))
  return true
}

export const html = htmlExecutor
