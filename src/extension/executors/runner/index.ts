import {
  NotebookCellOutputItem,
  NotebookCellOutput,
  Task,
  TaskScope,
  CustomExecution,
  TaskRevealKind,
  TaskPanelKind,
  tasks,
  TextDocument,
  window,
} from 'vscode'
import { Subject, debounceTime } from 'rxjs'
import { RpcError } from '@protobuf-ts/runtime-rpc'

import getLogger from '../../logger'
import { ClientMessages, NOTEBOOK_RUN_WITH_PROMPTS } from '../../../constants'
import { ClientMessage } from '../../../types'
import { PLATFORM_OS } from '../../constants'
import {
  IRunner,
  IRunnerProgramSession,
  RunProgramExecution,
  RunProgramOptions,
} from '../../runner'
import { IRunnerEnvironment } from '../../runner/environment'
import { getAnnotations, getCellRunmeId, getTerminalByCell } from '../../utils'
import { postClientMessage } from '../../../utils/messaging'
import {
  getCloseTerminalOnSuccess,
  isNotebookTerminalEnabledForCell,
} from '../../../utils/configuration'
import { ITerminalState } from '../../terminal/terminalState'
import { toggleTerminal } from '../../commands'
import {
  // CommandMode,
  ResolveProgramRequest_Mode,
  ResolveProgramResponse_Status,
  ResolveProgramResponse_VarResult,
  progconf,
} from '../../grpc/runner/v2alpha1'
import { closeTerminalByEnvID } from '../task'
import {
  getCellProgram,
  getNotebookSkipPromptEnvSetting,
  getCmdShellSeq,
  isShellLanguage,
  // getCommandExportExtractMatches,
  promptUserForVariable,
} from '../utils'
import { handleVercelDeployOutput, isVercelDeployScript } from '../vercel'
import { IKernelExecutorOptions } from '..'
import ContextState from '../../contextState'

import { createRunProgramOptions } from './factory'

const log = getLogger('executeRunner')
const LABEL_LIMIT = 15
const BACKGROUND_TASK_HIDE_TIMEOUT = 2000
const MIME_TYPES_WITH_CUSTOM_RENDERERS = ['text/plain']

export interface IKernelRunnerOptions extends IKernelExecutorOptions {
  runner: IRunner
  runningCell: TextDocument
  cellId: string
  execKey: string
  runnerEnv?: IRunnerEnvironment
}

export type IKernelRunner = (executor: IKernelRunnerOptions) => Promise<boolean>

type VarResult = ResolveProgramResponse_VarResult

export const executeRunner: IKernelRunner = async ({
  kernel,
  context,
  runner,
  exec,
  runningCell,
  messaging,
  cellId,
  execKey,
  outputs,
  runnerEnv,
  envMgr,
}: IKernelRunnerOptions) => {
  const { interactive, mimeType, background, closeTerminalOnSuccess } = getAnnotations(exec.cell)
  // enforce background tasks as singleton instanes
  // to do this,
  if (background) {
    const terminal = getTerminalByCell(exec.cell)

    if (terminal && terminal.runnerSession) {
      if (!terminal.runnerSession.hasExited()) {
        await toggleTerminal(kernel, true, true)(exec.cell)
        return true
      } else {
        terminal.dispose()
      }
    }
  }

  let programOptions: RunProgramOptions
  try {
    const isVercel = isVercelDeployScript(runningCell.getText())
    const resolveRunProgram = isVercel ? resolveProgramOptionsVercel : resolveProgramOptionsScript
    programOptions = await resolveRunProgram({
      exec,
      execKey,
      runnerEnv,
      runningCell,
      runner,
    })
  } catch (err) {
    if (err instanceof RpcError && err.methodName === 'ResolveProgram') {
      const message = err.message
      window.showErrorMessage('Invalid shell snippet: ' + message)
    }
    if (err instanceof Error) {
      // todo(sebastian): user facing error? notif?
      log.error(err.message)
    }
    return false
  }

  const program = await runner.createProgramSession(programOptions)
  context.subscriptions.push(program)

  let terminalState: ITerminalState | undefined

  const writeToTerminalStdout = (data: string | Uint8Array) => {
    postClientMessage(messaging, ClientMessages.terminalStdout, {
      'runme.dev/id': cellId,
      data,
    })

    terminalState?.write(data)
  }

  program.onDidErr((data) =>
    postClientMessage(messaging, ClientMessages.terminalStderr, {
      'runme.dev/id': cellId,
      data,
    }),
  )

  messaging.onDidReceiveMessage(({ message }: { message: ClientMessage<ClientMessages> }) => {
    const { type, output } = message

    if (typeof output === 'object' && 'runme.dev/id' in output) {
      const id = output['runme.dev/id']
      if (id !== cellId) {
        return
      }
    }

    switch (type) {
      case ClientMessages.terminalStdin:
        {
          const { input } = output

          program.handleInput(input)
          terminalState?.input(input, true)
        }
        break

      case ClientMessages.terminalFocus:
        {
          program.setActiveTerminalWindow('notebook')
        }
        break

      case ClientMessages.terminalResize:
        {
          const { terminalDimensions } = output
          program.setDimensions(terminalDimensions, 'notebook')
        }
        break

      case ClientMessages.terminalOpen:
        {
          const { terminalDimensions } = output
          program.open(terminalDimensions, 'notebook')
        }
        break
    }
  })

  program.onDidClose((code) => {
    postClientMessage(messaging, ClientMessages.onProgramClose, {
      'runme.dev/id': cellId,
      code,
      escalationButton: kernel.hasExperimentEnabled('escalationButton', false)!,
    })
    if (!background) {
      return
    }

    const parts = ['Program exited']

    if (code !== undefined) {
      parts.push(`with code ${code}`)
    }

    const text = parts.join(' ') + '.'

    writeToTerminalStdout(`\x1B[7m * \x1B[0m ${text}`)
  })

  if (interactive) {
    program.registerTerminalWindow('vscode')
    await program.setActiveTerminalWindow('vscode')
  }

  let revealNotebookTerminal = isNotebookTerminalEnabledForCell(exec.cell)

  const mime = mimeType || ('text/plain' as const)

  terminalState = await kernel.registerCellTerminalState(
    exec.cell,
    revealNotebookTerminal ? 'xterm' : 'local',
  )

  const cellText = runningCell.getText()
  const scriptVercel = getCmdShellSeq(cellText, PLATFORM_OS)
  if (MIME_TYPES_WITH_CUSTOM_RENDERERS.includes(mime) && !isVercelDeployScript(scriptVercel)) {
    if (revealNotebookTerminal) {
      program.registerTerminalWindow('notebook')
      await program.setActiveTerminalWindow('notebook')
    }

    program.onDidWrite(writeToTerminalStdout)

    await outputs.showTerminal()
  } else {
    const output: Buffer[] = []
    const outputItems$ = new Subject<NotebookCellOutputItem>()

    // adapted from `shellExecutor` in `shell.ts`
    const _handleOutput = async (data: Uint8Array) => {
      output.push(Buffer.from(data))

      let item: NotebookCellOutputItem | undefined = new NotebookCellOutputItem(
        Buffer.concat(output),
        mime,
      )

      // hacky for now, maybe inheritence is a fitting pattern
      const isVercelProd = process.env['vercelProd'] === 'true'
      if (isVercelDeployScript(scriptVercel)) {
        await handleVercelDeployOutput(
          exec.cell,
          outputs,
          output,
          exec.cell.index,
          isVercelProd,
          envMgr,
        )

        item = undefined
      } else if (MIME_TYPES_WITH_CUSTOM_RENDERERS.includes(mime)) {
        await outputs.showTerminal()
        item = undefined
      }

      if (item) {
        outputItems$.next(item)
      }
    }

    // debounce by 0.5s because human preception likely isn't as fast
    const sub = outputItems$
      .pipe(debounceTime(500))
      .subscribe((item) => outputs.replaceOutputs([new NotebookCellOutput([item])]))

    context.subscriptions.push({ dispose: () => sub.unsubscribe() })

    program.onStdoutRaw(_handleOutput)
    program.onStderrRaw(_handleOutput)
    program.onDidClose(() => outputItems$.complete())
  }

  if (!interactive) {
    exec.token.onCancellationRequested(() => {
      program.close()
    })
  } else {
    await outputs.replaceOutputs([])

    const RUNME_ID = getCellRunmeId(exec.cell)
    const taskExecution = new Task(
      { type: 'shell', name: `Runme Task (${RUNME_ID})` },
      TaskScope.Workspace,
      (cellText.length > LABEL_LIMIT ? `${cellText.slice(0, LABEL_LIMIT)}...` : cellText) +
        ` (RUNME_ID: ${RUNME_ID})`,
      'exec',
      new CustomExecution(async () => program),
    )

    taskExecution.isBackground = background
    taskExecution.presentationOptions = {
      focus: revealNotebookTerminal ? false : true,
      reveal: revealNotebookTerminal
        ? TaskRevealKind.Never
        : background
          ? TaskRevealKind.Never
          : TaskRevealKind.Always,
      panel: background ? TaskPanelKind.Dedicated : TaskPanelKind.Shared,
    }

    const execution = await tasks.executeTask(taskExecution)

    context.subscriptions.push({
      dispose: () => execution.terminate(),
    })

    exec.token.onCancellationRequested(() => {
      try {
        // runs `program.close()` implicitly
        execution.terminate()
      } catch (err: any) {
        log.error(`Failed to terminate task: ${(err as Error).message}`)
        throw new Error(err)
      }
    })

    tasks.onDidStartTaskProcess((e) => {
      const taskId = (e.execution as any)['_id']
      const executionId = (execution as any)['_id']

      if (taskId !== executionId) {
        return
      }

      const terminal = getTerminalByCell(exec.cell)
      if (!terminal) {
        return
      }

      terminal.runnerSession = program
      kernel.registerTerminal(terminal, executionId, RUNME_ID)

      // proxy pid value
      Object.defineProperty(terminal, 'processId', {
        get: function () {
          return program.pid
        },
      })
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
        typeof e.exitCode === 'undefined'
      ) {
        return
      }

      /**
       * only close terminal if execution passed and desired by user
       */
      const closeIt = getCloseTerminalOnSuccess() && closeTerminalOnSuccess
      if (e.exitCode === 0 && closeIt && !background) {
        closeTerminalByEnvID(RUNME_ID)
      }
    })
  }

  if (program.numTerminalWindows === 0) {
    await program.run()
  }

  return await new Promise<boolean>(async (resolve, reject) => {
    const terminalState = outputs.getCellTerminalState()
    program.onDidClose(async (code) => {
      const pid = await program.pid
      updateProcessInfo(program, terminalState, pid)
      resolve(code === 0)
    })

    program.onInternalErr((e) => {
      const pid = undefined
      updateProcessInfo(program, terminalState, pid)
      reject(e)
    })

    const exitReason = program.hasExited()

    // unexpected early return, likely an error
    if (exitReason) {
      const pid = undefined
      updateProcessInfo(program, terminalState, pid)
      switch (exitReason.type) {
        case 'error':
          {
            reject(exitReason.error)
          }
          break

        case 'exit':
          {
            resolve(exitReason.code === 0)
          }
          break

        default: {
          resolve(false)
        }
      }
    }

    if (background && interactive) {
      setTimeout(() => {
        resolve(true)
      }, BACKGROUND_TASK_HIDE_TIMEOUT)
    }
  })
}

type IResolveRunProgram = (resovler: IResolveRunProgramOptions) => Promise<RunProgramOptions>

type IResolveRunProgramOptions = { runner: IRunner } & Pick<
  IKernelRunnerOptions,
  'exec' | 'execKey' | 'runnerEnv' | 'runningCell'
>

export const resolveProgramOptionsScript: IResolveRunProgram = async ({
  runner,
  runnerEnv,
  exec,
  execKey,
  runningCell,
}: IResolveRunProgramOptions): Promise<RunProgramOptions> => {
  const { promptEnv } = getAnnotations(exec.cell)
  const forceInputPrompt = ContextState.getKey(NOTEBOOK_RUN_WITH_PROMPTS)
  const script = exec.cell.document.getText()

  // Document level settings
  const skipPromptEnvDocumentLevel = getNotebookSkipPromptEnvSetting(exec.cell.notebook)
  const promptMode = forceInputPrompt
    ? ResolveProgramRequest_Mode.PROMPT_ALL
    : skipPromptEnvDocumentLevel === false
      ? promptEnv
      : ResolveProgramRequest_Mode.SKIP_ALL

  const RUNME_ID = getCellRunmeId(exec.cell)
  const envs: Record<string, string> = {
    RUNME_ID,
  }

  const { commandMode } = getCellProgram(exec.cell, exec.cell.notebook, execKey)
  const execution: RunProgramExecution = await resolveRunProgramExecution(
    runner,
    runnerEnv,
    envs,
    script,
    execKey, // same as languageId
    commandMode,
    promptMode,
  )

  return createRunProgramOptions(execKey, runningCell, exec, execution, runnerEnv)
}

export const resolveProgramOptionsVercel: IResolveRunProgram = async ({
  runnerEnv,
  exec,
  execKey,
  runningCell,
}: IResolveRunProgramOptions): Promise<RunProgramOptions> => {
  const script = runningCell.getText()

  const scriptVercel = getCmdShellSeq(script, PLATFORM_OS)
  const isVercelProd = process.env['vercelProd'] === 'true'
  const parts = [scriptVercel]
  if (isVercelProd) {
    parts.push('--prod')
  }
  const commands = [parts.join(' ')]

  const execution: RunProgramExecution = {
    type: 'commands',
    commands,
  }

  return createRunProgramOptions(execKey, runningCell, exec, execution, runnerEnv)
}

/**
 * Prompts for vars that are exported as necessary
 */
export async function resolveRunProgramExecution(
  runner: IRunner,
  runnerEnv: IRunnerEnvironment | undefined,
  envs: Record<string, string>,
  script: string,
  languageId: string,
  commandMode: progconf.CommandMode,
  promptMode: ResolveProgramRequest_Mode,
): Promise<RunProgramExecution> {
  if (commandMode !== progconf.CommandMode.INLINE) {
    return {
      type: 'script',
      script,
    }
  }

  const resolver = await runner.createProgramResolver(promptMode, envs)
  // todo(sebastian): removing $-prompts from shell scripts should move kernel-side
  const rawCommands = prepareCommandSeq(script, languageId)
  const result = await resolver.resolveProgram(rawCommands, runnerEnv?.getSessionId())
  const vars = result.response.vars

  // todo(sebastian): once normalization is all kernel-side, it should return commands
  script = result.response.script ?? script

  // const commands = await parseCommandSeq(script, languageId, exportMatches, skipEnvs)
  const promptReducer = async (acc: Promise<CommandBlock[]>, current: VarResult) => {
    return promptVariablesAsync(await acc, current)
  }

  const parsedCommandBlocks: CommandBlock[] = await vars.reduce(promptReducer, Promise.resolve([]))
  parsedCommandBlocks.push({ type: 'block', content: script.slice(0) })

  const commands = parsedCommandBlocks.flatMap(({ type, content }) => {
    if (type === 'block') {
      return prepareCommandSeq(content, languageId)
    }
    return content ? [content] : []
  })

  if (commands.length === 0) {
    commands.push('')
  }

  return {
    type: 'commands',
    commands,
  }
}

type CommandBlock =
  | {
      type: 'block'
      content: string
    }
  | {
      type: 'single'
      content: string
    }

export async function promptVariablesAsync(
  blocks: CommandBlock[],
  variable: VarResult,
): Promise<CommandBlock[]> {
  let userValue = ''

  switch (variable.status) {
    case ResolveProgramResponse_Status.RESOLVED:
      userValue = variable.resolvedValue
      break

    case ResolveProgramResponse_Status.UNRESOLVED_WITH_MESSAGE:
    case ResolveProgramResponse_Status.UNRESOLVED_WITH_PLACEHOLDER: {
      const key = variable.name
      const placeHolder = variable.resolvedValue || variable.originalValue || 'Enter a value please'
      const hasStringValue =
        variable.status === ResolveProgramResponse_Status.UNRESOLVED_WITH_PLACEHOLDER
      const isPassword = false

      const userInput = await promptUserForVariable(key, placeHolder, hasStringValue, isPassword)

      if (userInput === undefined) {
        throw new Error('Cannot run cell due to canceled prompt')
      }

      userValue = userInput
      break
    }

    default:
      return blocks
  }

  if (userValue) {
    blocks.push({ type: 'single', content: `export ${variable.name}="${userValue}"` })
  }

  return blocks
}

function updateProcessInfo(
  program: IRunnerProgramSession,
  terminalState: ITerminalState | undefined,
  pid: number | undefined,
) {
  const exitReason = program.hasExited()
  if (!terminalState || !exitReason) {
    return
  }

  terminalState.setProcessInfo({
    exitReason,
    pid,
  })
}

/**
 * Does the following to a command list:
 *
 * - Splits by new lines
 * - Removes preceeding `$` characters
 */
export function prepareCommandSeq(cellText: string, languageId: string): string[] {
  if (!isShellLanguage(languageId)) {
    return cellText ? cellText.split('\n') : []
  }

  return cellText.split('\n').map((l) => {
    const stripped = l.trimStart()

    if (stripped.startsWith('$')) {
      return stripped.slice(1).trimStart()
    }

    return l
  })
}

export default executeRunner
