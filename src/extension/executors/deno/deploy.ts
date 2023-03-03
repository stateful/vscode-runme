import { NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution } from 'vscode'

import { renderError } from '../utils'
import { OutputType, ClientMessages } from '../../../constants'
import { DENO_ACCESS_TOKEN_KEY, DENO_PROJECT_NAME_KEY } from '../../constants'
import { API } from '../../../utils/deno/api'
import type { Kernel } from '../../kernel'
import type { CellOutputPayload, ClientMessage } from '../../../types'
import { replaceOutput } from '../../utils'
import { ENV_STORE_MANAGER, type IEnvironmentManager } from '..'

export async function deploy (
  this: Kernel,
  exec: NotebookCellExecution,
  environment?: IEnvironmentManager
): Promise<boolean> {
  environment ??= ENV_STORE_MANAGER

  let token = await environment?.get(DENO_ACCESS_TOKEN_KEY)
  const pname = await environment?.get(DENO_PROJECT_NAME_KEY)

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
    replaceOutput(exec, new NotebookCellOutput([
      NotebookCellOutputItem.json(
        <CellOutputPayload<OutputType.deno>>{ type: OutputType.deno }, OutputType.deno)
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
      // lookup project name if not available use most recent
      const project = projects?.find(p => p.name === pname) || projects![0]
      const deployments = await denoAPI.getDeployments(project.id)
      if ((deployments || []).length > 0) {
        created = new Date(deployments![0].createdAt) ?? start
      }

      deployed = created > start
      this.messaging.postMessage(<ClientMessage<ClientMessages.update>>{
        type: ClientMessages.update,
        output: {
          deployed,
          deployments,
          project
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
