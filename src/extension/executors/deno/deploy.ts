import { NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution, window } from 'vscode'

import { OutputType } from '../../../constants'
import type { CellOutput } from '../../../types'
import { ENV_STORE } from '../../constants'
import { API } from '../../../utils/deno/api'

export async function deploy (
  exec: NotebookCellExecution,
  // doc: TextDocument,
  // argv: any
): Promise<boolean> {
  let token = ENV_STORE.get('DENO_ACCESS_TOKEN')

  const cancel = new Promise<void>((_, reject) =>
    exec.token.onCancellationRequested(() =>
      reject(new Error("Canceled by user"))))

  try {
    if (!token) {
      token = await window.showInputBox({
        title: 'Deno Access Token',
        prompt: 'Please enter a valid access token to run a Deno deployment.'
      })
    }

    if (!token) {
      throw new Error('No token supplied')
    }

    const start = new Date()

    const denoAPI = API.fromToken(token)
    const projects = await denoAPI.getProjects()

    if ((projects ?? []).length < 1) {
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
      exec.replaceOutput(new NotebookCellOutput([
        NotebookCellOutputItem.json(<CellOutput>{
            type: OutputType.deno,
            output: { project: projects![0], deployments, deployed },
          }, OutputType.deno),
        ], { deno: { deploy: true } }))

      // keep going slower after 20 loops
      const timeout = 1000 + Math.max(0, iteration - 20) * 1000
      const wait = new Promise<void>(resolve => { setTimeout(() => { resolve() }, timeout) })
      await Promise.race([wait, cancel])
      iteration++
    }
    if (!deployed) {
      exec.replaceOutput(new NotebookCellOutput([
        NotebookCellOutputItem.json(<CellOutput>{
          type: 'error',
          output: 'Timed out'
        }, OutputType.deno)
      ]))
    }
  } catch (err: any) {
    exec.replaceOutput(new NotebookCellOutput([
      NotebookCellOutputItem.json(<CellOutput>{
        type: 'error',
        output: err.message
      }, OutputType.deno)
    ]))
    return false
  }

  return true
}
