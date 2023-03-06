import { NotebookCellExecution, TextDocument, window } from 'vscode'

import { DENO_ACCESS_TOKEN_KEY } from '../constants'
import type { Kernel } from '../kernel'

import { bash } from './task'
import { deploy } from './deno/deploy'

import { ENV_STORE_MANAGER } from '.'

export async function deno (
  this: Kernel,
  exec: NotebookCellExecution,
  doc: TextDocument,
  runScript?: () => Promise<boolean>,
  environment = ENV_STORE_MANAGER
): Promise<boolean> {
  /**
   * ensure token is set for operations
   */
  const token = await environment?.get(DENO_ACCESS_TOKEN_KEY)
  if (!token) {
    const userInput = await window.showInputBox({
      title: 'Deno Access Token',
      prompt: 'Please enter a valid access token to run a Deno deployment.',
      ignoreFocusOut: true
    })
    userInput && await environment?.set(DENO_ACCESS_TOKEN_KEY, userInput)
  }

  return Promise.all([
    /**
     * run actual deno deployment as bash script
     */
    runScript?.() ?? bash.call(this, exec, doc),
    /**
     * fetch data and render custom output
     */
    deploy.call(this, exec, environment)
  ]).then(
    ([bashSuccess, deploySuccess]) => bashSuccess && deploySuccess
  )
}
