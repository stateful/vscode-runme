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
import {
  Observable,
  debounceTime,
  map,
  filter,
  first,
  from,
  scan,
  withLatestFrom,
  Subscription,
} from 'rxjs'
import { RpcError } from '@protobuf-ts/runtime-rpc'

import getLogger from '../../logger'
import { ClientMessages, NOTEBOOK_RUN_WITH_PROMPTS, OutputType } from '../../../constants'
import { ClientMessage } from '../../../types'
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
  getServerRunnerVersion,
  isNotebookTerminalEnabledForCell,
} from '../../../utils/configuration'
import { ITerminalState } from '../../terminal/terminalState'
import { toggleTerminal } from '../../commands'
import { closeTerminalByEnvID, openTerminalByEnvID } from '../task'
import {
  getCellProgram,
  getNotebookSkipPromptEnvSetting,
  isShellLanguage,
  promptUserForVariable,
} from '../utils'
import { IKernelExecutorOptions } from '..'
import ContextState from '../../contextState'
import {
  CommandMode,
  CommandModeEnum,
  ResolveProgramResponse_VarResult,
  ResolveProgramRequest_Mode,
  ResolveProgramRequest_ModeEnum,
  ResolveProgramResponse_StatusEnum,
} from '../../grpc/runner/types'
import { getDocumentCacheId } from '../../serializer'

import { createRunProgramOptions } from './factory'

const log = getLogger('executeRunner')
const LABEL_LIMIT = 15
const BACKGROUND_TASK_HIDE_TIMEOUT = 2000
const CELL_MIME_TYPE_DEFAULT: string = 'text/plain' as const
const MIME_TYPES_WITH_CUSTOM_RENDERERS = [CELL_MIME_TYPE_DEFAULT]

export interface IKernelRunnerOptions extends IKernelExecutorOptions {
  runner: IRunner
  runningCell: TextDocument
  cellId: string
  execKey: string
  runnerEnv?: IRunnerEnvironment
}

export type IKernelRunner = (executor: IKernelRunnerOptions) => Promise<boolean>

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
  runScript,
}: IKernelRunnerOptions) => {
  const {
    interactive,
    mimeType: cellMimeType,
    background,
    closeTerminalOnSuccess,
    openTerminalOnError,
  } = getAnnotations(exec.cell)
  // enforce background tasks as singleton instances
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

  // default is inline shell aka script
  let resolveRunProgram: IResolveRunProgram = resolveProgramOptionsScript

  const { commandMode } = getCellProgram(exec.cell, exec.cell.notebook, execKey)
  if (commandMode === CommandModeEnum().DAGGER) {
    resolveRunProgram = resolveProgramOptionsDagger
  }

  let programOptions: RunProgramOptions
  try {
    programOptions = await resolveRunProgram({
      kernel,
      exec,
      execKey,
      runnerEnv,
      runningCell,
      runner,
      cellId,
    })
  } catch (err) {
    if (err instanceof RpcError && err.methodName?.startsWith('Resolve')) {
      const message = err.message
      window.showErrorMessage('Invalid shell snippet: ' + message)
    }
    if (err instanceof RpcError) {
      log.error(`RpcError: ${err.code} ${err.message}`)
    }
    // todo(sebastian): user facing error? notif?
    if (err instanceof Error) {
      log.error(err.message)
    }
    return false
  }

  const program = await runner.createProgramSession(programOptions)
  context.subscriptions.push(program)

  let terminalState: ITerminalState | undefined

  let writeToTerminalStdout: (data: string | Uint8Array) => void

  if (interactive) {
    // receives both stdout+stderr via tty
    writeToTerminalStdout = (data: string | Uint8Array) => {
      postClientMessage(messaging, ClientMessages.terminalStdout, {
        'runme.dev/id': cellId,
        data,
      })

      terminalState?.write(data)
    }
    program.onDidWrite(writeToTerminalStdout)
  } else {
    writeToTerminalStdout = (data: string | Uint8Array) => {
      terminalState?.write(data)
    }
    program.onStdoutRaw(writeToTerminalStdout)
  }

  program.onDidErr(async (data) => {
    // todo(sebastian): dagger-shell is not UX integration ready yet
    // if (execKey === 'daggerShell') {
    //   try {
    //     const daggerJsonParsed = JSON.parse(data || '{}')
    //     daggerJsonParsed.runme = { cellText: runningCell.getText() }
    //     await kernel.saveOutputState(exec.cell, OutputType.daggerShell, {
    //       json: JSON.stringify(daggerJsonParsed),
    //     })
    //     return messaging.postMessage(<ClientMessage<ClientMessages.daggerSyncState>>{
    //       type: ClientMessages.daggerSyncState,
    //       output: {
    //         id: cellId,
    //         cellId: cellId,
    //         json: daggerJsonParsed,
    //       },
    //     })
    //   } catch (err) {
    //     console.error('failed to parse dagger json', err)
    //     await kernel.cleanOutputState(exec.cell, OutputType.daggerShell)
    //     return postClientMessage(messaging, ClientMessages.terminalStdout, {
    //       'runme.dev/id': cellId,
    //       data,
    //     })
    //   }
    // }
    return postClientMessage(messaging, ClientMessages.terminalStderr, {
      'runme.dev/id': cellId,
      data,
    })
  })

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

  program.registerTerminalWindow('vscode')
  await program.setActiveTerminalWindow('vscode')

  const revealNotebookTerminal = isNotebookTerminalEnabledForCell(exec.cell)

  terminalState = await kernel.registerCellTerminalState(
    exec.cell,
    programOptions,
    revealNotebookTerminal ? 'xterm' : 'local',
  )

  let mimeType = cellMimeType
  if (interactive) {
    if (revealNotebookTerminal) {
      program.registerTerminalWindow('notebook')
      await program.setActiveTerminalWindow('notebook')
    }

    // allow for additional outputs, such as dagger
    const t = OutputType[execKey as keyof typeof OutputType]
    // todo(sebastian): dagger-shell is not UX integration ready yet
    if (t && commandMode !== CommandModeEnum().DAGGER) {
      await outputs.showOutput(t)
    }

    await outputs.showTerminal()
  } else {
    const mime = program.mimeType.then((mime) => mimeType || mime || CELL_MIME_TYPE_DEFAULT)
    const mime$ = from(mime)
    const raw$ = new Observable<Uint8Array>((observer) => {
      program.onStdoutRaw((data) => observer.next(data))
      program.onDidClose(() => observer.complete())
    }).pipe(
      scan((acc, data) => {
        const combined = new Uint8Array(acc.length + data.length)
        combined.set(acc)
        combined.set(data, acc.length)
        return combined
      }, new Uint8Array()),
    )

    // debounce by 0.5s because human preception likely isn't as fast
    let item$ = raw$.pipe(debounceTime(500)).pipe(
      withLatestFrom(mime$),
      map(([item, mime]) => new NotebookCellOutputItem(Buffer.from(item), mime)),
    )

    const isCustomMime = (mime: string) => {
      return MIME_TYPES_WITH_CUSTOM_RENDERERS.includes(mime)
    }

    let subs: Subscription[] = [
      // render vanilla mime types, eg PNG/SVG
      item$
        .pipe(
          filter((item) => {
            return !isCustomMime(item.mime)
          }),
        )
        .subscribe({
          next: (item) => outputs.replaceOutputs([new NotebookCellOutput([item])]),
        }),
      // render custom mime type for text/plain to show copy buttons etc
      item$
        .pipe(
          filter((item) => {
            return isCustomMime(item.mime)
          }),
          first(),
        )
        .subscribe({
          next: () => outputs.showOutput(OutputType.outputItems),
        }),
    ]

    context.subscriptions.push({ dispose: () => subs.forEach((s) => s.unsubscribe()) })
  }

  const cellText = runningCell.getText()
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
    focus: false,
    reveal: interactive
      ? TaskRevealKind.Never
      : background
        ? TaskRevealKind.Never
        : TaskRevealKind.Silent,
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
    const closeIt = interactive && getCloseTerminalOnSuccess() && closeTerminalOnSuccess
    if (e.exitCode === 0 && closeIt && !background) {
      closeTerminalByEnvID(RUNME_ID)
    }

    /**
     * open non-interactive terminal if execution exited with non-zero
     */
    const openIt = !interactive && openTerminalOnError
    if (e.exitCode !== 0 && openIt && !background) {
      openTerminalByEnvID(RUNME_ID)
    }
  })

  if (program.numTerminalWindows === 0) {
    await program.run()
  }

  const main = await new Promise<boolean>(async (resolve, reject) => {
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

  let secondary = true
  if (runScript) {
    secondary = await runScript()
  }

  return main && secondary
}

type IResolveRunProgram = (resolver: IResolveRunProgramOptions) => Promise<RunProgramOptions>

type IResolveRunProgramOptions = { runner: IRunner } & Pick<
  IKernelRunnerOptions,
  'kernel' | 'exec' | 'execKey' | 'runnerEnv' | 'runningCell' | 'cellId'
>

export const resolveProgramOptionsScript: IResolveRunProgram = async ({
  runner,
  runnerEnv,
  exec,
  execKey,
  runningCell,
  cellId,
}: IResolveRunProgramOptions): Promise<RunProgramOptions> => {
  const { promptEnv } = getAnnotations(exec.cell)
  const forceInputPrompt = ContextState.getKey(NOTEBOOK_RUN_WITH_PROMPTS)
  let script = exec.cell.document.getText()

  // temp hack for dagger integration
  if (execKey === 'daggerCall' && !script.includes(' --help')) {
    const varName = `DAGGER_${cellId}`
    script = 'export ' + varName + '=$(' + script + '\n)'
  }

  const { PROMPT_ALL, SKIP_ALL } = ResolveProgramRequest_ModeEnum()

  // Document level settings
  const skipPromptEnvDocumentLevel = getNotebookSkipPromptEnvSetting(exec.cell.notebook)
  const promptMode = forceInputPrompt
    ? PROMPT_ALL
    : skipPromptEnvDocumentLevel === false
      ? promptEnv
      : SKIP_ALL

  const RUNME_ID = getCellRunmeId(exec.cell)
  const RUNME_RUNNER = getServerRunnerVersion()
  const envs: Record<string, string> = {
    RUNME_ID,
    RUNME_RUNNER,
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

export const resolveProgramOptionsDagger: IResolveRunProgram = async ({
  kernel,
  runner,
  runnerEnv,
  exec,
  execKey,
  runningCell,
}: IResolveRunProgramOptions): Promise<RunProgramOptions> => {
  const cacheId = getDocumentCacheId(exec.cell.notebook.metadata)
  if (!cacheId) {
    throw new Error('Cannot resolve notebook without cache entry')
  }

  const cachedNotebook = await kernel.getParserCache(cacheId, exec.cell)
  const notebookResolver = await runner.createNotebook(cachedNotebook)
  const daggerShellScript = await notebookResolver.resolveDaggerNotebook(exec.cell.index)

  const execution: RunProgramExecution = {
    type: 'commands',
    commands: prepareCommandSeq(daggerShellScript, execKey),
  }

  const runProgramOptions = createRunProgramOptions(
    execKey,
    runningCell,
    exec,
    execution,
    runnerEnv,
  )

  return runProgramOptions
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
  commandMode: CommandMode,
  promptMode: ResolveProgramRequest_Mode,
): Promise<RunProgramExecution> {
  const { INLINE_SHELL, DAGGER } = CommandModeEnum()
  if (commandMode !== INLINE_SHELL && commandMode !== DAGGER) {
    return {
      type: 'script',
      script,
    }
  }

  const resolver = await runner.createProgramResolver(promptMode, envs)
  // todo(sebastian): removing $-prompts from shell scripts should move kernel-side
  const rawCommands = prepareCommandSeq(script, languageId)
  const result = await resolver.resolveProgram(rawCommands, languageId, runnerEnv?.getSessionId())
  const vars = result.response.vars

  // todo(sebastian): once normalization is all kernel-side, it should return commands
  script = result.response.script ?? script

  // const commands = await parseCommandSeq(script, languageId, exportMatches, skipEnvs)
  const promptReducer = async (
    acc: Promise<CommandBlock[]>,
    current: ResolveProgramResponse_VarResult,
  ) => {
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
  variable: ResolveProgramResponse_VarResult,
): Promise<CommandBlock[]> {
  let userValue = ''

  const { RESOLVED, UNRESOLVED_WITH_MESSAGE, UNRESOLVED_WITH_PLACEHOLDER, UNRESOLVED_WITH_SECRET } =
    ResolveProgramResponse_StatusEnum()

  switch (variable.status) {
    case RESOLVED:
      userValue = variable.resolvedValue
      break

    case UNRESOLVED_WITH_MESSAGE:
    case UNRESOLVED_WITH_PLACEHOLDER:
    case UNRESOLVED_WITH_SECRET: {
      const key = variable.name
      const placeHolder = variable.resolvedValue || variable.originalValue || 'Enter a value please'
      const hasStringValue = variable.status === UNRESOLVED_WITH_PLACEHOLDER
      const isPassword = variable.status === UNRESOLVED_WITH_SECRET

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

  const isHeredoc = cellText.indexOf('<<') !== -1

  return cellText.split('\n').map((l: string) => {
    const stripped = l.trimStart()

    if (stripped.startsWith('$') && !isHeredoc) {
      return stripped.slice(1).trimStart()
    }

    return l
  })
}

export default executeRunner
