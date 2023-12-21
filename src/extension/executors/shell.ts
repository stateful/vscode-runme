import { spawn } from 'node:child_process'

import { NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution } from 'vscode'

import { OutputType } from '../../constants'
import type { CellOutputPayload } from '../../types'
import { NotebookCellOutputManager } from '../cell'
import type { Kernel } from '../kernel'
import { getAnnotations } from '../utils'
import getLogger from '../logger'

import { handleVercelDeployOutput, isVercelDeployScript } from './vercel'

import { ENV_STORE_MANAGER } from '.'

const MIME_TYPES_WITH_CUSTOM_RENDERERS = ['text/plain']
const log = getLogger('shellExecutor')

async function shellExecutor(
  this: Kernel,
  exec: NotebookCellExecution,
  script: string,
  cwd: string,
  env: Record<string, string>,
  outputs: NotebookCellOutputManager,
): Promise<boolean> {
  let postScript = script
  let prod = false
  if (process.env['vercelProd'] === 'true') {
    prod = true
    postScript = `${postScript} --prod`
    process.env['vercelProd'] = 'false'
  }
  const outputItems: Buffer[] = []
  const child = spawn(postScript, { cwd, shell: true, env })
  log.info(`Started process on pid ${child.pid}`)
  /**
   * this needs more work / specification
   */
  const annotations = getAnnotations(exec.cell)
  const mime = annotations?.mimeType || ('text/plain' as const)
  const index = exec.cell.index

  /**
   * handle output for stdout and stderr
   */
  async function handleOutput(data: Buffer) {
    outputItems.push(data)
    let item: NotebookCellOutputItem | undefined

    // hacky for now, maybe inheritence is a fitting pattern
    if (isVercelDeployScript(script)) {
      await handleVercelDeployOutput(
        exec.cell,
        outputs,
        outputItems,
        index,
        prod,
        ENV_STORE_MANAGER,
      )
    } else if (MIME_TYPES_WITH_CUSTOM_RENDERERS.includes(mime)) {
      item = NotebookCellOutputItem.json(
        <CellOutputPayload<OutputType.outputItems>>{
          type: OutputType.outputItems,
          output: {
            content: Buffer.concat(outputItems).toString('base64'),
            mime,
          },
        },
        OutputType.outputItems,
      )
    } else {
      item = new NotebookCellOutputItem(Buffer.concat(outputItems), mime)
    }

    if (item) {
      outputs.replaceOutputs([new NotebookCellOutput([item])])
    }
  }

  child.stdout.on('data', handleOutput)
  child.stderr.on('data', handleOutput)
  return !Boolean(
    await new Promise<number>((resolve) => {
      /**
       * register cancellation handler
       * ToDo(Christian): maybe better to kill with SIGINT signal but that doesn't stop the
       * prcoess afterall
       */
      exec.token.onCancellationRequested(() => {
        child.stdin.destroy()
        child.stdout.off('data', handleOutput)
        child.stderr.off('data', handleOutput)

        if (child.pid) {
          process.kill(child.pid, 'SIGHUP')
        }
        resolve(child.kill('SIGHUP') ? 0 : 1)
      })

      child.on('exit', resolve)
    }),
  )
}

export const sh = shellExecutor
export const bash = shellExecutor
