import {
  TextDocument, NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution,
  ExtensionContext
} from 'vscode'

import { OutputType } from '../../constants'
import type { CellOutput } from '../../types'

async function htmlExecutor(
  context: ExtensionContext,
  exec: NotebookCellExecution,
  doc: TextDocument
): Promise<boolean> {
  const vitePort = context.globalState.get('viteServerPort') as number

  exec.replaceOutput(new NotebookCellOutput([
    NotebookCellOutputItem.json(<CellOutput>{
      type: OutputType.html,
      output: {
        content: doc.getText(),
        port: vitePort
      }
    }, OutputType.html)
  ]))
  return true
}

export const html = htmlExecutor
