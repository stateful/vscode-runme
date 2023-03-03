import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import type { Argv } from 'yargs'
import { TextDocument, NotebookCellExecution, NotebookCellOutputItem } from 'vscode'

import type { Kernel } from '../kernel'
import { OutputType } from '../../constants'
import { CellOutputPayload } from '../../types'

import { bash } from './task'
import { deploy, login, logout } from './vercel/index'
import { renderError } from './utils'

import type { IEnvironmentManager } from '.'

const DEFAULT_COMMAND = 'deploy'

export async function vercel (
  this: Kernel,
  exec: NotebookCellExecution,
  doc: TextDocument,
  runScript?: () => Promise<boolean>,
): Promise<boolean> {
  const command = doc.getText()

  /**
   * limit vercel commands to single lines
   */
  if (command.includes('\n')) {
    renderError(exec, 'Currently only one-liner Vercel commands are supported')
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
  const vercelCommand = ((await parsedArgv.argv)._)[0] || DEFAULT_COMMAND

  /**
   * special commands handled by the kernel
   */
  if (vercelCommand === 'deploy') {
    return deploy.call(this, exec, doc)
  }
  if (vercelCommand === 'login') {
    return login.call(this, exec, parsedArgv)
  }
  if (vercelCommand === 'logout') {
    return logout.call(this, exec)
  }

  /**
   * other commands passed to the CLI
   */
  return runScript?.() ?? bash.call(this, exec, doc)
}

export async function handleVercelDeployOutput(
  outputItems: Buffer[],
  index: number,
  prod: boolean,
  environment?: IEnvironmentManager,
) {
  const states = [
    'Queued',
    'Building',
    'Completing',
  ].reverse()

  const status = (states.find((s) =>
    outputItems.find(
      (oi) => oi.toString().toLocaleLowerCase().indexOf(s.toLocaleLowerCase()) > -1
    )
  ) || 'pending').replaceAll('Completing', 'complete')
  // should get this from API instead
  const projectName = await environment?.get('PROJECT_NAME')

  const json = <CellOutputPayload<OutputType.vercel>>{
    type: OutputType.vercel,
    output: {
      outputItems: outputItems.map((oi) => oi.toString()),
      payload: { status, projectName, index, prod }
    }
  }
  return NotebookCellOutputItem.json(json, OutputType.vercel)
}

export function isVercelDeployScript(script: string): boolean {
  return script.trim().endsWith('vercel')
}
