import { NotebookCellExecution } from 'vscode'

import type { Kernel } from '../kernel'

async function replExecutor(
  this: Kernel,
  exec: NotebookCellExecution
  // script: string
  // cwd: string,
  // env: Record<string, string>
): Promise<boolean> {
  this.session.stdin?.write(`run ${exec.cell.metadata.name}\n`)

  function handleOutput(data: any) {
    const dataString = data.toString().trim()
    if (dataString.trim() === '>') {
      return
    }

    console.log(dataString)
  }

  this.session.stdout?.on('data', handleOutput)
  this.session.stderr?.on('data', handleOutput)
  await new Promise((r) => setTimeout(r, 1000))
  return true
}

export const repl = replExecutor
