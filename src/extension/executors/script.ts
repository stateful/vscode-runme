import fs from 'node:fs/promises'
import path from 'node:path'

import {
  TextDocument, NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution,
  ExtensionContext
} from 'vscode'

import { ViteServerProcess } from '../server'
import { OutputType } from '../../constants'
import type { CellOutput } from '../../types'

import render, { SUPPORTED_FRAMEWORKS } from './script/index'

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
  const framework = attributes.framework as typeof SUPPORTED_FRAMEWORKS
  const filename = Buffer.from(
    `${path.basename(exec.cell.document.fileName).replace('.', '_')}_${exec.cell.index}_${Date.now()}`
  ).toString('base64')
  const artifacts = render(framework, code, filename, attributes)
  for (const [ext, src] of Object.entries(artifacts)) {
    await fs.writeFile(path.resolve(__dirname, `${filename}.${ext}`), src)
  }

  exec.replaceOutput(new NotebookCellOutput([
    NotebookCellOutputItem.json(<CellOutput>{
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
