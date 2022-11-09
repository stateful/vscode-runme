import path from 'node:path'

import { NotebookCellExecution, NotebookCellOutputItem, NotebookCellOutput } from 'vscode'

import type { Kernel } from '../kernel'
import { OutputType } from '../../constants'
import type { CellOutput } from '../../types'

import { renderError } from './utils'

async function replExecutor(
  this: Kernel,
  exec: NotebookCellExecution
  // script: string
  // cwd: string,
  // env: Record<string, string>
): Promise<boolean> {
  const deamon = this.deamons.get(exec.cell.document.uri.fsPath)
  if (!deamon) {
    renderError(exec, `Couldn't find deamon for file ${exec.cell.document.uri.fsPath}`)
    return false
  }

  const outputItems: string[] = []
  function handleStdout (data: Buffer) {
    const message = JSON.parse(data.toString())
    if (message.type !== 'stdout' || message.value === '\n' || !message.value) {
      return
    }
    outputItems.push(message.value.endsWith('\n') ? message.value.slice(0, -1) : message.value)
    let item = NotebookCellOutputItem.stdout(outputItems.join('\n'))
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

  async function command (command: string, file: string, dir: string) {
    console.log(`Send command: "${command}" for ${file} in ${dir}`)
    deamon!.ws.send(JSON.stringify({ command, file, dir }))
    return new Promise<number>((resolve) => {
      function listener (msg: Buffer) {
        const message = JSON.parse(msg.toString())
        const value = message.value.toString().trim()

        console.log(`[${message.type}] ${value}`)
        if (message.type === 'exitCode') {
          deamon!.ws.off('message', listener)
          resolve(message.value)
        }
      }
      deamon!.ws.on('message', listener)
    })
  }

  deamon.ws.on('message', handleStdout)
  await command(
    exec.cell.metadata.name,
    path.basename(exec.cell.document.uri.fsPath),
    path.dirname(exec.cell.document.uri.fsPath)
  )
  deamon.ws.off('message', handleStdout)
  return true
}

export const repl = replExecutor
