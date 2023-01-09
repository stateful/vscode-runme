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
  let pid: number
  let isRunning = true
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

  function updateOutput () {
    const item = MIME_TYPES_WITH_CUSTOM_RENDERERS.includes(metadata.mimeType)
      ? NotebookCellOutputItem.json(<CellOutputPayload<OutputType.outputItems>>{
        type: OutputType.outputItems,
        output: {
          content: Buffer.concat(outputItems).toString('base64'),
          metadata,
          pid,
          isRunning,
          filePath: exec.cell.notebook.uri.fsPath
        }
      }, OutputType.outputItems)
      : new NotebookCellOutputItem(
        Buffer.concat(outputItems),
        metadata.mimeType || DEFAULT_MIME_TYPE
      )

    exec.replaceOutput([ new NotebookCellOutput([ item ]) ])
  }

  const outputStream = new PassThrough()
  outputStream.on('data', (data: Buffer) => {
    outputItems.push(Buffer.from(data))
    updateOutput()
  })
  terminal.onDidStartNewProcess((cp) => {
    if (!cp.pid) {
      return
    }
    pid = cp.pid
    if (metadata.background) {
      outputItems.push(Buffer.from(`Running background process (PID: ${pid})`))
    }
    updateOutput()
  })

  const { execution, promise, cancellationToken } = await terminal.execute(t, {
    stdout: outputStream,
    stderr: outputStream
  })
  function cancelTask () {
    if (metadata.background) {
      outputItems[0] = Buffer.from('Background process stopped!')
    }

    terminal.cancelExecution()
    execution.terminate()
  }
  this.context.subscriptions.push(
    // when task gets terminated
    cancellationToken.onCancellationRequested(cancelTask),
    // when stop button next to cell is clicked
    exec.token.onCancellationRequested(cancelTask)
  )


  /**
   * push task as disposable to context so that it is being closed
   * when extension terminates
   */
  this.context.subscriptions.push({
    dispose: () => execution.terminate()
  })

  const hasSuccess = (await promise === 0)
  isRunning = false
  updateOutput()

  return hasSuccess
}
