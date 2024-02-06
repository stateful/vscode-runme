import { window } from 'vscode'

import { DENO_ACCESS_TOKEN_KEY } from '../constants'

import { bash } from './task'
import { deploy } from './deno/deploy'

import { IKernelExecutor } from '.'

export const deno: IKernelExecutor = async (executor) => {
  const { envMgr, runScript } = executor
  /**
   * ensure token is set for operations
   */
  const token = await envMgr?.get(DENO_ACCESS_TOKEN_KEY)
  if (!token) {
    const userInput = await window.showInputBox({
      title: 'Deno Access Token',
      prompt: 'Please enter a valid access token to run a Deno deployment.',
      ignoreFocusOut: true,
    })
    userInput && (await envMgr?.set(DENO_ACCESS_TOKEN_KEY, userInput))
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
