import { NotebookCellExecution } from 'vscode'

import { OutputType, ClientMessages } from '../../../constants'
import { DENO_ACCESS_TOKEN_KEY, DENO_PROJECT_NAME_KEY } from '../../constants'
import { API } from '../../../utils/deno/api'
import type { Kernel } from '../../kernel'
import type { DenoState } from '../../../types'
import { ENV_STORE_MANAGER, type IEnvironmentManager } from '..'
import { postClientMessage } from '../../../utils/messaging'
import { NotebookCellOutputManager, updateCellMetadata } from '../../cell'

export async function deploy(
  this: Kernel,
  exec: NotebookCellExecution,
  outputs: NotebookCellOutputManager,
  environment?: IEnvironmentManager,
): Promise<boolean> {
  environment ??= ENV_STORE_MANAGER

  let token = await environment?.get(DENO_ACCESS_TOKEN_KEY)
  const pname = await environment?.get(DENO_PROJECT_NAME_KEY)

  const cancel = new Promise<void>((_, reject) =>
    exec.token.onCancellationRequested(() => reject(new Error('Canceled by user'))),
  )

  try {
    if (!token) {
      throw new Error('No token supplied')
    }

    const denoState: DenoState = {
      ...exec.cell.metadata['runme.dev/denoState'],
      error: undefined,
    }

    updateCellMetadata(exec.cell, { 'runme.dev/denoState': denoState })

    outputs.showOutput(OutputType.deno)

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
      const project = projects?.find((p) => p.name === pname) || projects![0]
      const deployments = await denoAPI.getDeployments(project.id)
      if ((deployments || []).length > 0) {
        created = new Date(deployments![0].createdAt) ?? start
      }

      deployed = created > start

      const denoState: DenoState = {
        ...exec.cell.metadata['runme.dev/denoState'],
        deployed,
        deployments: deployments ?? undefined,
        project,
        error: undefined,
      }

      updateCellMetadata(exec.cell, { 'runme.dev/denoState': denoState })
      postClientMessage(this.messaging, ClientMessages.denoUpdate, denoState)

      // keep going slower after 20 loops
      const timeout = 1000 + Math.max(0, iteration - 20) * 1000
      const wait = new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve()
        }, timeout)
      })
      await Promise.race([wait, cancel])
      iteration++
    }
    if (!deployed) {
      throw new Error('Timed out')
    }
  } catch (err: any) {
    const denoState: DenoState = {
      ...exec.cell.metadata['runme.dev/denoState'],
      error: err.message,
    }

    updateCellMetadata(exec.cell, { 'runme.dev/denoState': denoState })
    outputs.showOutput(OutputType.deno)

    return false
  }

  return true
}
