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
  const code = doc.getText()
  const isSvelte = code.includes('on:click')

  exec.replaceOutput(new NotebookCellOutput([
    NotebookCellOutputItem.json(<CellOutput>{
      type: OutputType.html,
      output: {
        isSvelte,
        content: code,
        port: vitePort
      }
    }, OutputType.html)
  ]))
  return true
}

export const html = htmlExecutor
