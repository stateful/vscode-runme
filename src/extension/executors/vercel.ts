import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import type { Argv } from 'yargs'
import { TextDocument, NotebookCellExecution, NotebookCell } from 'vscode'

import type { Kernel } from '../kernel'
import { VercelState } from '../../types'
import { NotebookCellOutputManager, updateCellMetadata } from '../cell'
import { OutputType } from '../../constants'

import { bash } from './task'
import { deploy, login, logout } from './vercel/index'

import type { IEnvironmentManager } from '.'

const DEFAULT_COMMAND = 'deploy'

export async function vercel(
  this: Kernel,
  exec: NotebookCellExecution,
  doc: TextDocument,
  outputs: NotebookCellOutputManager,
  runScript?: () => Promise<boolean>
): Promise<boolean> {
  const command = doc.getText()

  try {
    /**
     * limit vercel commands to single lines
     */
    if (command.includes('\n')) {
      throw new Error('Currently only one-liner Vercel commands are supported')
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
    const vercelCommand = (await parsedArgv.argv)._[0] || DEFAULT_COMMAND

    /**
     * special commands handled by the kernel
     */
    if (vercelCommand === 'deploy') {
      return deploy.call(this, exec, doc, outputs)
    }
    if (vercelCommand === 'login') {
      return login.call(this, exec, parsedArgv, outputs)
    }
    if (vercelCommand === 'logout') {
      return logout.call(this, exec, outputs)
    }

    /**
     * other commands passed to the CLI
     */
    return runScript?.() ?? bash.call(this, exec, doc, outputs)
  } catch (err: any) {
    updateCellMetadata(exec.cell, {
      'runme.dev/vercelState': { error: err.message, outputItems: [] },
    })
    outputs.showOutput(OutputType.vercel)

    return false
  }
}

export async function handleVercelDeployOutput(
  cell: NotebookCell,
  outputs: NotebookCellOutputManager,
  outputItems: Buffer[],
  index: number,
  prod: boolean,
  environment?: IEnvironmentManager
) {
  const states = ['Queued', 'Building', 'Completing'].reverse()

  const status = (
    states.find((s) =>
      outputItems.find(
        (oi) => oi.toString().toLocaleLowerCase().indexOf(s.toLocaleLowerCase()) > -1
      )
    ) || 'pending'
  ).replaceAll('Completing', 'complete')
  // should get this from API instead
  const projectName = await environment?.get('PROJECT_NAME')

  const vercelState: VercelState = {
    outputItems: outputItems.map((oi) => oi.toString()),
    payload: { status, projectName, index, prod },
  }

  outputs.setState({
    type: OutputType.vercel,
    state: vercelState,
  })

  await outputs.showOutput(OutputType.vercel)
}

export function isVercelDeployScript(script: string): boolean {
  return script.trim().endsWith('vercel')
}
