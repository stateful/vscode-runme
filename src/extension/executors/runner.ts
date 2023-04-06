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
  ExtensionContext,
  NotebookRendererMessaging,
} from 'vscode'

import { ClientMessages, OutputType } from '../../constants'
import { CellOutputPayload, ClientMessage } from '../../types'
import { PLATFORM_OS } from '../constants'
import { IRunner, IRunnerEnvironment, RunProgramExecution } from '../runner'
import { getAnnotations, getCmdShellSeq, prepareCmdSeq, replaceOutput } from '../utils'
import { postClientMessage } from '../../utils/messaging'
import { isNotebookTerminalEnabledForCell } from '../../utils/configuration'
import { Kernel } from '../kernel'
import { ITerminalState } from '../terminal/terminalState'

import { closeTerminalByEnvID } from './task'
import { getShellPath, parseCommandSeq } from './utils'
import { handleVercelDeployOutput, isVercelDeployScript } from './vercel'

import type { IEnvironmentManager } from '.'

const LABEL_LIMIT = 15
const BACKGROUND_TASK_HIDE_TIMEOUT = 2000
const MIME_TYPES_WITH_CUSTOM_RENDERERS = ['text/plain']

export async function executeRunner(
  kernel: Kernel,
  context: ExtensionContext,
  runner: IRunner,
  exec: NotebookCellExecution,
  runningCell: TextDocument,
  messaging: NotebookRendererMessaging,
  cellUUID: string,
  execKey: 'bash' | 'sh',
  environment?: IRunnerEnvironment,
  environmentManager?: IEnvironmentManager
) {
  const cwd = path.dirname(runningCell.uri.fsPath)

  const RUNME_ID = `${runningCell.fileName}:${exec.cell.index}`

  let cellText = exec.cell.document.getText()

  const envs: Record<string, string> = {
    RUNME_ID
  }

  const commands = await parseCommandSeq(cellText, prepareCmdSeq)
  if(!commands) { return false }

  if (commands.length === 0) {
    commands.push('')
  }

  const annotations = getAnnotations(exec.cell)
  const { interactive, mimeType, background, closeTerminalOnSuccess } = annotations

  let execution: RunProgramExecution = {
    type: 'commands', commands
  }

  const script = getCmdShellSeq(cellText, PLATFORM_OS)

  const isVercel = isVercelDeployScript(script)
  const vercelProd = process.env['vercelProd'] === 'true'

  if (isVercel) {
    const cmdParts = [script]

    if (vercelProd) {
      cmdParts.push('--prod')
    }

    execution = {
      type: 'script', script: cmdParts.join(' ')
    }
  }

  const program = await runner.createProgramSession({
    programName: getShellPath(execKey),
    environment,
    exec: execution,
    envs: Object.entries(envs).map(([k, v]) => `${k}=${v}`),
    cwd,
    tty: interactive
  })

  context.subscriptions.push(program)

  let terminalState: ITerminalState | undefined

  program.onDidWrite((data) => {
    postClientMessage(messaging, ClientMessages.terminalStdout, {
      'runme.dev/uuid': cellUUID,
      data
    })

    terminalState?.write(data)
  })

  program.onDidErr((data) => postClientMessage(messaging, ClientMessages.terminalStderr, {
    'runme.dev/uuid': cellUUID,
    data
  }))

  messaging.onDidReceiveMessage(({ message }: { message: ClientMessage<ClientMessages> }) => {
    const { type, output } = message

    if (type !== ClientMessages.terminalStdin) { return }

    const { 'runme.dev/uuid': uuid, input } = output

    if (uuid !== cellUUID) { return }

    program.handleInput(input)
    terminalState?.input(input, true)
  })

  let revealNotebookTerminal = isNotebookTerminalEnabledForCell(exec.cell)

  if (revealNotebookTerminal) {
    terminalState = kernel.registerCellTerminalState(exec.cell, 'xterm')

    const terminalOutput = kernel.getCellTerminalOutputPayload(exec.cell)

    if (terminalOutput) {
      await replaceOutput(exec, terminalOutput)
    } else {
      revealNotebookTerminal = false
    }
  }


  if (!interactive) {
    const output: Buffer[] = []

    const mime = mimeType || 'text/plain' as const

    // adapted from `shellExecutor` in `shell.ts`
    const handleOutput = async (data: Uint8Array) => {
      if (revealNotebookTerminal) {
        return
      }

      output.push(Buffer.from(data))

      let item = new NotebookCellOutputItem(Buffer.concat(output), mime)

      // hacky for now, maybe inheritence is a fitting pattern
      if (isVercelDeployScript(script)) {
        item = await handleVercelDeployOutput(
          output, exec.cell.index, vercelProd, environmentManager
        )
      } else if (MIME_TYPES_WITH_CUSTOM_RENDERERS.includes(mime)) {
        item = NotebookCellOutputItem.json(<CellOutputPayload<OutputType.outputItems>>{
          type: OutputType.outputItems,
          output: {
            content: Buffer.concat(output).toString('base64'),
            mime
          }
        }, OutputType.outputItems)
      }

      replaceOutput(exec, [new NotebookCellOutput([item])])
    }

    program.onStdoutRaw(handleOutput)
    program.onStderrRaw(handleOutput)

    exec.token.onCancellationRequested(() => {
      program.close()
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
      focus: revealNotebookTerminal ? false : true,
      reveal: revealNotebookTerminal ? TaskRevealKind.Never : background ? TaskRevealKind.Never : TaskRevealKind.Always,
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
      } catch (err: any) {
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
      if (e.exitCode === 0 && closeTerminalOnSuccess && !background) {
        closeTerminalByEnvID(RUNME_ID)
      }
    })
  }

  return await new Promise<boolean>((resolve, reject) => {
    program.onDidClose((code) => {
      resolve(code === 0)
    })

    program.onInternalErr((e) => {
      reject(e)
    })

    const exitReason = program.hasExited()

    // unexpected early return, likely an error
    if (exitReason) {
      switch (exitReason.type) {
        case 'error': {
          reject(exitReason.error)
        } break

        case 'exit': {
          resolve(exitReason.code === 0)
        } break

        default: {
          resolve(false)
        }
      }
    }

    if (background && interactive) {
      setTimeout(
        () => {
          if (closeTerminalOnSuccess) {
            closeTerminalByEnvID(RUNME_ID)
          }

          resolve(true)
        },
        BACKGROUND_TASK_HIDE_TIMEOUT
      )
    }
  })
}

