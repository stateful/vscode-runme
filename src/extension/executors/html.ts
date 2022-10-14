import {
  TextDocument, NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution,
} from 'vscode'

import { ViteServerProcess } from '../server'
import { OutputType } from '../../constants'
import type { CellOutput } from '../../types'
import type { Kernel } from '../kernel'

async function htmlExecutor(
  this: Kernel,
  exec: NotebookCellExecution,
  doc: TextDocument
): Promise<boolean> {
  const viteProcess = this.context.subscriptions.find(
    (s) => s instanceof ViteServerProcess) as ViteServerProcess | undefined

  if (!viteProcess) {
    throw new Error('Vite Server process not registered to the context')
  }

  const code = doc.getText()
  const isSvelte = code.includes('on:click')

  exec.replaceOutput(new NotebookCellOutput([
    NotebookCellOutputItem.json(<CellOutput<OutputType.html>>{
      type: OutputType.html,
      output: {
        isSvelte,
        content: code,
        port: viteProcess.port
      }
    }, OutputType.html)
  ]))
  return true
}

export const html = htmlExecutor
