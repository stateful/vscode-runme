import { NotebookCellExecution, TextDocument, window } from 'vscode'

import { ENV_STORE, DENO_ACCESS_TOKEN_KEY } from '../constants'
import type { Kernel } from '../kernel'

import { bash } from './task'
import { deploy } from './deno/deploy'

export async function deno (
  this: Kernel,
  exec: NotebookCellExecution,
  doc: TextDocument
): Promise<boolean> {
  /**
   * ensure token is set for operations
   */
  const token = ENV_STORE.get(DENO_ACCESS_TOKEN_KEY)
  if (!token) {
    const userInput = await window.showInputBox({
      title: 'Deno Access Token',
      prompt: 'Please enter a valid access token to run a Deno deployment.',
      ignoreFocusOut: true
    })
    userInput && ENV_STORE.set(DENO_ACCESS_TOKEN_KEY, userInput)
  }

  return Promise.all([
    /**
     * run actual deno deployment as bash script
     */
    bash.call(this, exec, doc),
    /**
     * fetch data and render custom output
     */
    deploy.call(this, exec)
  ]).then(
    ([bashSuccess, deploySuccess]) => bashSuccess && deploySuccess
  )
}
