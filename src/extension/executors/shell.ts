import { spawn } from 'node:child_process'

import { NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution } from 'vscode'

import { OutputType } from '../../constants'
import type { CellOutput } from '../../types'
import type { Kernel } from '../kernel'

async function shellExecutor(
  this: Kernel,
  exec: NotebookCellExecution,
  script: string,
  cwd: string,
  env: Record<string, string>
): Promise<boolean> {
  const outputItems: string[] = []
  const child = spawn(script, { cwd, shell: true, env })
  console.log(`[Runme] Started process on pid ${child.pid}`)
  /**
   * this needs more work / specification
   */
  const contentType = exec.cell.metadata.attributes?.['output']

  /**
   * handle output for stdout and stderr
   */
  function handleOutput(data: any) {
    outputItems.push(data.toString().trim())
    let item = NotebookCellOutputItem.stdout(outputItems.join('\n'))

    switch (contentType) {
      case 'application/json':
      item = NotebookCellOutputItem.json(<CellOutput<OutputType.shell>>{
        type: contentType,
        output: outputItems.join('\n')
      }, contentType)
    }

    exec.replaceOutput([
      new NotebookCellOutput([ item ]),
      new NotebookCellOutput([
        NotebookCellOutputItem.json(<CellOutput<OutputType.outputItems>>{
          type: OutputType.outputItems,
          output: outputItems.join('\n')
        }, OutputType.outputItems)
      ])
    ])
  }

  child.stdout.on('data', handleOutput)
  child.stderr.on('data', handleOutput)
  return !Boolean(await new Promise<number>((resolve) => {
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
  }))
}

export const sh = shellExecutor
export const bash = shellExecutor
