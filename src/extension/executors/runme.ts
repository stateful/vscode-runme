import { PassThrough } from 'node:stream'

import { NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution } from 'vscode'

import { RunmeTaskProvider } from '../provider/runmeTask'
import { OutputType } from '../../constants'
import { getExecutionProperty } from '../utils'
import { ExperimentalTerminal } from '../terminal/terminal'
import type { CellOutputPayload } from '../../types'
import type { Kernel } from '../kernel'

const MIME_TYPES_WITH_CUSTOM_RENDERERS = ['text/plain']

export async function runme(
  this: Kernel,
  exec: NotebookCellExecution,
  terminal: ExperimentalTerminal
): Promise<boolean> {
  const outputItems: Buffer[] = []
  const mime = exec.cell.metadata.mimeType || 'text/plain' as const
  const isBackground = exec.cell.metadata.attributes?.['background'] === 'true'
  const closeTerminalOnSuccess = getExecutionProperty('closeTerminalOnSuccess', exec.cell)
  const t = RunmeTaskProvider.getRunmeTask(
    exec.cell.notebook.uri.fsPath,
    exec.cell.index,
    {
      isBackground,
      closeTerminalOnSuccess
    }
  )

  const outputStream = new PassThrough()
  outputStream.on('data', (data: Buffer) => {
    console.log('NEW stdout EVENT', data)

    outputItems.push(Buffer.from(data))
    let item = new NotebookCellOutputItem(Buffer.concat(outputItems), mime)

    if (MIME_TYPES_WITH_CUSTOM_RENDERERS.includes(mime)) {
      item = NotebookCellOutputItem.json(<CellOutputPayload<OutputType.outputItems>>{
        type: OutputType.outputItems,
        output: {
          content: Buffer.concat(outputItems).toString('base64'),
          mime
        }
      }, OutputType.outputItems)
    }

    exec.replaceOutput([ new NotebookCellOutput([ item ]) ])
  })

  const { execution, promise } = await terminal.execute(t, {
    stdout: outputStream,
    stderr: outputStream
  })
  this.context.subscriptions.push(exec.token.onCancellationRequested(
    () => execution.terminate()))

  /**
   * push task as disposable to context so that it is being closed
   * when extension terminates
   */
  this.context.subscriptions.push({
    dispose: () => execution.terminate()
  })

  const hasSuccess = (await promise === 0)
  return hasSuccess
}
