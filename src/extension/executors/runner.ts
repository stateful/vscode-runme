import path from 'node:path'

import {
  NotebookCellOutputItem,
  NotebookCellOutput,
  Task,
  TaskScope,
  CustomExecution,
  TaskRevealKind,
  TaskPanelKind,
  tasks,
  NotebookCellExecution,
  TextDocument,
  ExtensionContext
} from 'vscode'

import { OutputType } from '../../constants'
import { CellOutputPayload } from '../../types'
import { PLATFORM_OS } from '../constants'
import { IRunner, IRunnerEnvironment } from '../runner'
import { getAnnotations, getCmdShellSeq, replaceOutput } from '../utils'

import { closeTerminalByEnvID } from './task'
import { getShellPath, parseCommandSeq } from './utils'

const LABEL_LIMIT = 15
const BACKGROUND_TASK_HIDE_TIMEOUT = 2000
const MIME_TYPES_WITH_CUSTOM_RENDERERS = ['text/plain']

export async function executeRunner(
  context: ExtensionContext,
  runner: IRunner,
  exec: NotebookCellExecution,
  runningCell: TextDocument,
  execKey: 'bash'|'sh',
  environment?: IRunnerEnvironment
) {
  const cwd = path.dirname(runningCell.uri.fsPath)

  const RUNME_ID = `${runningCell.fileName}:${exec.cell.index}`

  let cellText = exec.cell.document.getText()

  const envs: Record<string, string> = {
    RUNME_ID
  }

  const commands = await parseCommandSeq(cellText)
  if(!commands) { return false }

  if (commands.length === 0) {
    commands.push('')
  }

  const annotations = getAnnotations(exec.cell)
  const { interactive, mimeType, background } = annotations

  const program = await runner.createProgramSession({
    programName: getShellPath(execKey),
    environment,
    script: {
      type: 'commands', commands
    },
    envs: Object.entries(envs).map(([k, v]) => `${k}=${v}`),
    cwd,
    tty: interactive
  })

  if(!interactive) {
    const output: Buffer[] = []

    const mime = mimeType || 'text/plain' as const

    // adapted from `shellExecutor` in `shell.ts`
    const handleOutput = (data: Uint8Array) => {
      output.push(Buffer.from(data))

      let item = new NotebookCellOutputItem(Buffer.concat(output), mime)

      const script = getCmdShellSeq(cellText, PLATFORM_OS)

      // hacky for now, maybe inheritence is a fitting pattern
      if (script.trim().endsWith('vercel')) {
        // TODO: vercel (see `shellExecutor`)
      } else if (MIME_TYPES_WITH_CUSTOM_RENDERERS.includes(mime)) {
        item = NotebookCellOutputItem.json(<CellOutputPayload<OutputType.outputItems>>{
          type: OutputType.outputItems,
          output: {
            content: Buffer.concat(output).toString('base64'),
            mime
          }
        }, OutputType.outputItems)
      }

      replaceOutput(exec, [ new NotebookCellOutput([ item ]) ])
    }

    program.onStdoutRaw(handleOutput)
    program.onStderrRaw(handleOutput)

    exec.token.onCancellationRequested(() => {
      program.close()
    })

    context.subscriptions.push({
      dispose: () => program.close()
    })

    await program.run()
  } else {
    const taskExecution = new Task(
      { type: 'shell', name: `Runme Task (${RUNME_ID})` },
      TaskScope.Workspace,
      (cellText.length > LABEL_LIMIT
        ? `${cellText.slice(0, LABEL_LIMIT)}...`
        : cellText) + ` (RUNME_ID: ${RUNME_ID})`,
      'exec',
      new CustomExecution(async () => program)
    )

    taskExecution.isBackground = background
    taskExecution.presentationOptions = {
      focus: true,
      reveal: background ? TaskRevealKind.Never : TaskRevealKind.Always,
      panel: background ? TaskPanelKind.Dedicated : TaskPanelKind.Shared
    }

    const execution = await tasks.executeTask(taskExecution)

    context.subscriptions.push({
      dispose: () => execution.terminate()
    })

    exec.token.onCancellationRequested(() => {
      try {
        // runs `program.close()` implicitly
        execution.terminate()
        closeTerminalByEnvID(RUNME_ID)
      } catch (err: any) {
        // console.error(`[Runme] Failed to terminate task: ${(err as Error).message}`)
        throw new Error(`[Runme] Failed to terminate task: ${(err as Error).message}`)
      }
    })

    tasks.onDidEndTaskProcess((e) => {
      const taskId = (e.execution as any)['_id']
      const executionId = (execution as any)['_id']

      /**
       * ignore if
       */
      if (
        /**
         * VS Code is running a different task
         */
        taskId !== executionId ||
        /**
         * we don't have an exit code
         */
        typeof e.exitCode === 'undefined') {
        return
      }

      /**
       * only close terminal if execution passed and desired by user
       */
      if (e.exitCode === 0 && annotations.closeTerminalOnSuccess) {
        closeTerminalByEnvID(RUNME_ID)
      }
    })
  }

  return await new Promise<boolean>((resolve) => {
    program.onDidClose((code) => {
      resolve(code === 0)
    })

    program.onInternalErr((e) => {
      console.error('Internal failure executing runner', e)
      resolve(false)
    })

    if(program.hasExited()) {
      // unexpected early return, likely an error
      resolve(false)
    }

    if(background && interactive) {
      setTimeout(
        () => {
          closeTerminalByEnvID(RUNME_ID)
          resolve(true)
        },
        BACKGROUND_TASK_HIDE_TIMEOUT
      )
    }
  })
}

