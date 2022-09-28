import { EventEmitter } from 'node:events'

import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'

import { TextDocument, NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution } from 'vscode'

import { OutputType } from '../../constants'
import type { CellOutput } from '../../types'
import { bash } from './shell'
import { deploy, login, logout } from './vercel/index'

export async function vercel (
  exec: NotebookCellExecution,
  doc: TextDocument,
  inputHandler: EventEmitter
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

  const argv = yargs(hideBin(command.split(' '))).argv
  const vercelCommand = ((await argv)._)[0] || 'deploy'

  /**
   * special commands handled by the kernel
   */
  if (vercelCommand === 'deploy') {
    return deploy(exec, doc)
  }
  if (vercelCommand === 'login') {
    return login(exec)
  }
  if (vercelCommand === 'logout') {
    return logout(exec)
  }

  /**
   * other commands passed to the CLI
   */
  return bash(exec, doc, inputHandler)
}
