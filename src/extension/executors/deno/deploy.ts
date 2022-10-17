import { NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution } from 'vscode'

import { renderError } from '../utils'
import { OutputType, DenoMessages } from '../../../constants'
import { ENV_STORE, DENO_ACCESS_TOKEN_KEY } from '../../constants'
import { API } from '../../../utils/deno/api'
import type { Kernel } from '../../kernel'
import type { CellOutput, DenoMessage } from '../../../types'

export async function deploy (
  this: Kernel,
  exec: NotebookCellExecution,
): Promise<boolean> {
  let token = ENV_STORE.get(DENO_ACCESS_TOKEN_KEY)

  const cancel = new Promise<void>((_, reject) =>
    exec.token.onCancellationRequested(() =>
      reject(new Error('Canceled by user'))))

  try {
    if (!token) {
      throw new Error('No token supplied')
    }

    /**
     * render deno status at the behinning of the operation
     */
    exec.replaceOutput(new NotebookCellOutput([
      NotebookCellOutputItem.json(
        <CellOutput<OutputType.deno>>{ type: OutputType.deno }, OutputType.deno)
    ], { deno: { deploy: true } }))

    const start = new Date()
    const denoAPI = API.fromToken(token)
    const projects = await denoAPI.getProjects()
    if ((projects ?? []).length === 0) {
      throw new Error('No deno projects available')
    }

    let deployed = false
    let iteration = 0
    let created = start
    while (created <= start && iteration < 30) {
      const deployments = await denoAPI.getDeployments(projects![0].id)
      if ((deployments || []).length > 0) {
        created = new Date(deployments![0].createdAt) ?? start
      }

      deployed = created > start
      this.messaging.postMessage(<DenoMessage<DenoMessages.update>>{
        type: DenoMessages.update,
        output: {
          deployed,
          deployments,
          project: projects![0].name
        }
      })

      // keep going slower after 20 loops
      const timeout = 1000 + Math.max(0, iteration - 20) * 1000
      const wait = new Promise<void>(resolve => { setTimeout(() => { resolve() }, timeout) })
      await Promise.race([wait, cancel])
      iteration++
    }
    if (!deployed) {
      renderError(exec, 'Timed out')
      return false
    }
  } catch (err: any) {
    renderError(exec, err.message)
    return false
  }

  return true
}
