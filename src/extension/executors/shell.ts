import { spawn } from 'node:child_process'

import { NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution } from 'vscode'

import { OutputType } from '../../constants'
import type { CellOutput } from '../../types'

async function shellExecutor(
  exec: NotebookCellExecution,
  scriptPath: string,
  cwd: string,
  env: Record<string, string>
): Promise<boolean> {
  const outputItems: string[] = []
  const child = spawn(scriptPath, { cwd, shell: true, env })
  console.log(`[RunMe] Started process on pid ${child.pid}`)

  /**
   * handle output for stdout and stderr
   */
  function handleOutput(data: any) {
    outputItems.push(data.toString().trim())
    exec.replaceOutput(new NotebookCellOutput([
      NotebookCellOutputItem.json(<CellOutput>{
        type: OutputType.shell,
        output: outputItems.join('\n')
      }, OutputType.shell)
    ]))
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
