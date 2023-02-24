import { PassThrough } from 'node:stream'

import { NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution } from 'vscode'

import { RunmeTaskProvider } from '../provider/runmeTask'
import { OutputType } from '../../constants'
import { getAnnotations, replaceOutput } from '../utils'
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
  const annotations = getAnnotations(exec.cell)
  const t = RunmeTaskProvider.getRunmeTask(
    exec.cell.notebook.uri.fsPath,
    annotations.name,
    {
      isBackground: annotations.background,
      closeTerminalOnSuccess: annotations.closeTerminalOnSuccess
    }
  )

  const outputStream = new PassThrough()
  outputStream.on('data', (data: Buffer) => {
    outputItems.push(Buffer.from(data))
    let item = new NotebookCellOutputItem(Buffer.concat(outputItems), annotations.mimeType || DEFAULT_MIME_TYPE)

    if (MIME_TYPES_WITH_CUSTOM_RENDERERS.includes(annotations.mimeType)) {
      item = NotebookCellOutputItem.json(<CellOutputPayload<OutputType.outputItems>>{
        type: OutputType.outputItems,
        output: {
          content: Buffer.concat(outputItems).toString('base64'),
          mime: annotations.mimeType
        }
      }, OutputType.outputItems)
    }

    replaceOutput(exec, [ new NotebookCellOutput([ item ]) ])
  })

  const { execution, promise } = await terminal.execute(t, {
    stdout: outputStream,
    stderr: outputStream
  })
  this.context.subscriptions.push(exec.token.onCancellationRequested(() => {
    terminal.cancelExecution()
    execution.terminate()
  }))

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
