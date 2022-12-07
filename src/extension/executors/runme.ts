import { NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution, tasks, TextDocument } from 'vscode'

import { RunmeTaskProvider } from '../provider/runmeTask'
import { OutputType } from '../../constants'
import { getExecutionProperty } from '../utils'
import type { CellOutputPayload } from '../../types'
import type { Kernel } from '../kernel'

const MIME_TYPES_WITH_CUSTOM_RENDERERS = ['text/plain']

async function runmeExecutor(
  this: Kernel,
  exec: NotebookCellExecution,
  doc: TextDocument
): Promise<boolean> {
  console.log('RUN THIS');

  const outputItems: Buffer[] = []
  const mime = exec.cell.metadata.attributes?.mimeType || 'text/plain' as const
  const command: string = exec.cell.metadata['cliName']
  const isBackground = exec.cell.metadata.attributes?.['background'] === 'true'
  const closeTerminalOnSuccess = getExecutionProperty('closeTerminalOnSuccess', exec.cell)
  const t = RunmeTaskProvider.getRunmeTask(
    exec.cell.notebook.uri.fsPath,
    command,
    {
      isBackground,
      closeTerminalOnSuccess
    }
  )

  t.definition.stdoutEvent?.on('stdout', (data: string) => {
    console.log('YOOO', data);

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

  const execution = await tasks.executeTask(t)

  /**
   * push task as disposable to context so that it is being closed
   * when extension terminates
   */
  this.context.subscriptions.push({
    dispose: () => execution.terminate()
  })

  return (await t.definition.taskPromise) === 0
}

export const sh = runmeExecutor
export const bash = runmeExecutor
