import path from 'node:path'

import {
  TextDocument, NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution,
} from 'vscode'

import { ServerMessages } from '../../constants'
import { ViteServerProcess } from '../server'
import { OutputType } from '../../constants'
import type { CellOutput } from '../../types'
import type { Kernel } from '../kernel'

import render, { SUPPORTED_FRAMEWORKS } from './script/index'

async function scriptExecutor(
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
  const attributes: Record<string, string> = exec.cell.metadata.attributes || {}
  const framework = (attributes.framework || doc.languageId) as typeof SUPPORTED_FRAMEWORKS
  const filename = Buffer.from(
    `${path.basename(exec.cell.document.fileName).replace('.', '_')}_${exec.cell.index}_${Date.now()}`
  ).toString('base64')
  const artifacts = render(framework, code, filename, attributes)
  for (const [ext, src] of Object.entries(artifacts)) {
    console.log(`[Runme] define virtual file ${filename}.${ext}`)
    this.server.emit(ServerMessages.renderFile, {
      filename,
      ext,
      src
    })
  }

  exec.replaceOutput(new NotebookCellOutput([
    NotebookCellOutputItem.json(<CellOutput<OutputType.script>>{
      type: OutputType.script,
      output: {
        filename: `${filename}.html`,
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
