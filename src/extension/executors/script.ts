import {
  TextDocument, NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution,
  ExtensionContext
} from 'vscode'

import { ViteServerProcess } from '../server'
import { OutputType } from '../../constants'
import type { CellOutput } from '../../types'

async function scriptExecutor(
  context: ExtensionContext,
  exec: NotebookCellExecution,
  doc: TextDocument
): Promise<boolean> {
  const viteProcess = context.subscriptions.find(
    (s) => s instanceof ViteServerProcess) as ViteServerProcess | undefined

  if (!viteProcess) {
    throw new Error('Vite Server process not registered to the context')
  }

  const code = doc.getText()
  const attributes: Record<string, string> = exec.cell.metadata.attributes || {}

  exec.replaceOutput(new NotebookCellOutput([
    NotebookCellOutputItem.json(<CellOutput>{
      type: OutputType.script,
      output: {
        code,
        attributes,
        port: viteProcess.port
      }
    }, OutputType.html)
  ]))
  return true
}

export const js = scriptExecutor
export const jsx = scriptExecutor
export const ts = scriptExecutor
export const tsx = scriptExecutor
