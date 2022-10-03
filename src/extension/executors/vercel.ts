// import yargs from 'yargs/yargs'
// import { hideBin } from 'yargs/helpers'
// import type { Argv } from 'yargs'

import {
  TextDocument, NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution,
  ExtensionContext
} from 'vscode'

import { OutputType } from '../../constants'
import type { CellOutput } from '../../types'
import { bash } from './shell'
import { deploy } from './vercel/index'

export async function vercel (
  context: ExtensionContext,
  exec: NotebookCellExecution,
  doc: TextDocument
): Promise<boolean> {
  const command = doc.getText()

  /**
   * limit vercel commands to single lines
   */
  if (command.includes('\n')) {
    exec.replaceOutput(new NotebookCellOutput([
      NotebookCellOutputItem.json(<CellOutput>{
        type: 'error',
        output: 'Currently only one-liner Vercel commands are supported'
      }, OutputType.vercel)
    ]))
    return false
  }

  return Promise.all([bash(context, exec, doc), deploy(exec, doc)]).then(([a, b]) => a && b)
}
