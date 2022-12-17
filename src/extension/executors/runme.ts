import { PassThrough } from 'node:stream'

import { NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution } from 'vscode'

import { RunmeTaskProvider } from '../provider/runmeTask'
import { OutputType } from '../../constants'
import { getMetadata } from '../utils'
import { ExperimentalTerminal } from '../terminal/terminal'
import type { CellOutputPayload } from '../../types'
import type { Kernel } from '../kernel'

const DEFAULT_MIME_TYPE = 'text/plain'
const MIME_TYPES_WITH_CUSTOM_RENDERERS = [DEFAULT_MIME_TYPE]

export async function runme(
  this: Kernel,
  exec: NotebookCellExecution,
  terminal: ExperimentalTerminal
): Promise<boolean> {
  const outputItems: Buffer[] = []
  const metadata = getMetadata(exec.cell)
  const t = RunmeTaskProvider.getRunmeTask(
    exec.cell.notebook.uri.fsPath,
    metadata.name,
    {
      isBackground: metadata.background,
      closeTerminalOnSuccess: metadata.closeTerminalOnSuccess
    }
  )

  const outputStream = new PassThrough()
  outputStream.on('data', (data: Buffer) => {
    outputItems.push(Buffer.from(data))
    let item = new NotebookCellOutputItem(Buffer.concat(outputItems), metadata.mimeType || DEFAULT_MIME_TYPE)

    if (MIME_TYPES_WITH_CUSTOM_RENDERERS.includes(metadata.mimeType)) {
      item = NotebookCellOutputItem.json(<CellOutputPayload<OutputType.outputItems>>{
        type: OutputType.outputItems,
        output: {
          content: Buffer.concat(outputItems).toString('base64'),
          mime: metadata.mimeType
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
