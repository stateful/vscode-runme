import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import type { Argv } from 'yargs'
import {
  TextDocument, NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution,
} from 'vscode'

import { OutputType } from '../../constants'
import type { CellOutput } from '../../types'
import type { Kernel } from '../kernel'

import { bash } from './task'
import { deploy, login, logout } from './vercel/index'

export async function vercel (
  this: Kernel,
  exec: NotebookCellExecution,
  doc: TextDocument
): Promise<boolean> {
  const command = doc.getText()

  /**
   * limit vercel commands to single lines
   */
  if (command.includes('\n')) {
    exec.replaceOutput(new NotebookCellOutput([
      NotebookCellOutputItem.json(<CellOutput<OutputType.error>>{
        type: 'error',
        output: 'Currently only one-liner Vercel commands are supported'
      }, OutputType.vercel)
    ]))
    return false
  }

  const parsedArgv: Argv<any> = await yargs(hideBin(command.split(' ')))
    .version(false)
    .option('version', { alias: 'v', type: 'boolean' })
    .option('cwd', { type: 'string' })
    .option('platform-version', { alias: 'V', type: 'string' })
    .option('local-config', { alias: 'A', type: 'string' })
    .option('global-config', { alias: 'Q', type: 'string' })
    .option('debug', { alias: 'd', type: 'boolean' })
    .option('force', { alias: 'f', type: 'boolean' })
    .option('with-cache', { type: 'string' })
    .option('token', { alias: 't', type: 'string' })
    .option('public', { alias: 'p', type: 'boolean' })
    .option('env', { alias: 'e', type: 'string', array: true })
    .option('build-env', { alias: 'b', type: 'string', array: true })
    .option('meta', { alias: 'm', type: 'string', array: true })
    .option('scope', { alias: 'S', type: 'string' })
    .option('regions', { type: 'string', array: true })
    .option('prod', { type: 'boolean' })
    .option('yes', { alias: 'y', type: 'boolean' })
    .option('github', { type: 'boolean' })
    .option('gitlab', { type: 'boolean' })
    .option('bitbucket', { type: 'boolean' })
  const vercelCommand = ((await parsedArgv.argv)._)[0] || 'deploy'

  /**
   * special commands handled by the kernel
   */
  if (vercelCommand === 'deploy') {
    return deploy(exec, doc)
  }
  if (vercelCommand === 'login') {
    return login(exec, parsedArgv)
  }
  if (vercelCommand === 'logout') {
    return logout(exec)
  }

  /**
   * other commands passed to the CLI
   */
  return bash.call(this, exec, doc)
}
