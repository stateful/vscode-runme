import { window } from 'vscode'

import { DENO_ACCESS_TOKEN_KEY } from '../constants'

import { bash } from './task'
import { deploy } from './deno/deploy'

import { IKernelExecutor } from '.'

export async function deno(executor: IKernelExecutor): Promise<boolean> {
  const { environment, runScript } = executor
  /**
   * ensure token is set for operations
   */
  const token = await environment?.get(DENO_ACCESS_TOKEN_KEY)
  if (!token) {
    const userInput = await window.showInputBox({
      title: 'Deno Access Token',
      prompt: 'Please enter a valid access token to run a Deno deployment.',
      ignoreFocusOut: true,
    })
    userInput && (await environment?.set(DENO_ACCESS_TOKEN_KEY, userInput))
  }

  return Promise.all([
    /**
     * run actual deno deployment as bash script
     */
    runScript?.() ?? bash(executor),
    /**
     * fetch data and render custom output
     */
    deploy(executor),
  ]).then(([bashSuccess, deploySuccess]) => bashSuccess && deploySuccess)
}
