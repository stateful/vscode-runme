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

  if (!SUPPORTED_FRAMEWORKS.includes(attributes.framework)) {
    exec.replaceOutput(new NotebookCellOutput([
      NotebookCellOutputItem.text(attributes.framework
        ? `Framework "${attributes.framework}" not supported`
        : 'No framework annotation set'
      )
    ]))
    return false
  }

  const filename = Buffer.from(
    `${path.basename(exec.cell.document.fileName).replace('.', '_')}_${exec.cell.index}_${Date.now()}`
  ).toString('base64')
  const [html, script] = render(attributes.framework as typeof SUPPORTED_FRAMEWORKS, code, filename)
  await fs.writeFile(path.resolve(__dirname, `${filename}.html`), html)
  await fs.writeFile(path.resolve(__dirname, `${filename}.tsx`), script)

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
