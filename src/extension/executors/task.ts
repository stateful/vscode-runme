import cp from 'node:child_process'
import path from 'node:path'

import {
  Task,
  TaskScope,
  tasks,
  window,
  TaskRevealKind,
  TaskPanelKind,
  ShellExecution,
  NotebookCellExecution,
} from 'vscode'

import getLogger from '../logger'
import { getAnnotations, getTerminalRunmeId } from '../utils'
import { PLATFORM_OS, ENV_STORE } from '../constants'
import { DEFAULT_PROMPT_ENV } from '../../constants'
import { getCloseTerminalOnSuccess } from '../../utils/configuration'
import { ResolveProgramRequest_ModeEnum } from '../grpc/runner/types'

import {
  getCmdShellSeq,
  getCommandExportExtractMatches,
  populateEnvVar,
  promptUserForVariable,
} from './utils'
import { sh as inlineSh } from './shell'

import { IKernelExecutor } from '.'

const BACKGROUND_TASK_HIDE_TIMEOUT = 2000
const LABEL_LIMIT = 15
const log = getLogger('taskExecutor')

export function closeTerminalByEnvID(id: string, kill?: boolean) {
  const terminal = window.terminals.find((t) => getTerminalRunmeId(t) === id)
  if (terminal) {
    if (kill) {
      terminal.dispose()
    } else {
      terminal.hide()
    }
  }
}

export function openTerminalByEnvID(id: string) {
  const terminal = window.terminals.find((t) => getTerminalRunmeId(t) === id)
  if (terminal) {
    terminal.show()
  }
}

export const taskExecutor: IKernelExecutor = async (executor) => {
  const { context, exec, doc } = executor
  const { interactive: isInteractive, promptEnv } = getAnnotations(exec.cell)

  const { SKIP_ALL } = ResolveProgramRequest_ModeEnum()

  const cwd = path.dirname(doc.uri.fsPath)
  const cellText = await retrieveShellCommand(exec, promptEnv !== SKIP_ALL)
  if (typeof cellText !== 'string') {
    return false
  }

  const stateEnv = Object.fromEntries(ENV_STORE)

  const RUNME_ID = `${doc.fileName}:${exec.cell.index}`
  const env = {
    ...process.env,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    RUNME_TASK: 'true',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    RUNME_ID,
    ...stateEnv,
  }

  // skip empty scripts, eg env exports
  if (cellText.trim().length === 0) {
    return Promise.resolve(true)
  }

  const script = getCmdShellSeq(cellText, PLATFORM_OS)
  /**
   * run as non interactive shell script if set as configuration or annotated
   * in markdown section
   */
  if (!isInteractive) {
    return inlineSh({ ...executor, script, cwd, env })
  }

  const taskExecution = new Task(
    { type: 'shell', name: `Runme Task (${RUNME_ID})` },
    TaskScope.Workspace,
    cellText.length > LABEL_LIMIT ? `${cellText.slice(0, LABEL_LIMIT)}...` : cellText,
    'exec',
    new ShellExecution(script, { cwd, env }),
  )
  const annotations = getAnnotations(exec.cell)
  taskExecution.isBackground = annotations.background
  taskExecution.presentationOptions = {
    focus: true,
    // why doesn't this work with Slient?
    reveal: annotations.background ? TaskRevealKind.Never : TaskRevealKind.Always,
    panel: annotations.background ? TaskPanelKind.Dedicated : TaskPanelKind.Shared,
  }
  const execution = await tasks.executeTask(taskExecution)

  const p = new Promise<number>((resolve) => {
    context.subscriptions.push(
      exec.token.onCancellationRequested(() => {
        try {
          execution.terminate()
          closeTerminalByEnvID(RUNME_ID)
          resolve(0)
        } catch (err: any) {
          log.error(`Failed to terminate task: ${(err as Error).message}`)
          resolve(1)
        }
      }),
    )

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
      const closeIt = getCloseTerminalOnSuccess() && annotations.closeTerminalOnSuccess
      if (e.exitCode === 0 && closeIt) {
        closeTerminalByEnvID(RUNME_ID)
      }

      return resolve(e.exitCode)
    })
  })

  if (annotations.background) {
    const giveItTime = new Promise<boolean>((resolve) =>
      setTimeout(() => {
        closeTerminalByEnvID(RUNME_ID)
        return resolve(true)
      }, BACKGROUND_TASK_HIDE_TIMEOUT),
    )

    return Promise.race([p.then((exitCode) => exitCode === 0), giveItTime])
  }

  /**
   * push task as disposable to context so that it is being closed
   * when extension terminates
   */
  context.subscriptions.push({
    dispose: () => execution.terminate(),
  })

  return !Boolean(await p)
}

/**
 * Helper method to parse the shell code and runs the following operations:
 *   - fetches environment variable exports and puts them into ENV_STORE
 *   - runs embedded shell scripts for exports, e.g. `exports=$(echo "foobar")`
 *
 * @param exec NotebookCellExecution
 * @returns cell text if all operation to retrieve the cell text could be executed, undefined otherwise
 */
export async function retrieveShellCommand(
  exec: NotebookCellExecution,
  promptForEnv = DEFAULT_PROMPT_ENV,
) {
  let cellText = exec.cell.document.getText()
  const cwd = path.dirname(exec.cell.document.uri.fsPath)
  const rawText = exec.cell.document.getText()

  const exportMatches = getCommandExportExtractMatches(rawText, true, promptForEnv)

  const stateEnv = Object.fromEntries(ENV_STORE)

  for (const { hasStringValue, key, match, type, value } of exportMatches) {
    if (type === 'exec') {
      /**
       * evaluate expression
       */
      const expressionProcess = cp.spawn(value, {
        cwd,
        env: { ...process.env, ...stateEnv },
        shell: true,
      })
      const [isError, data] = await new Promise<[number, string]>((resolve) => {
        let data = ''
        expressionProcess.stdout.on('data', (payload) => {
          data += payload.toString()
        })
        expressionProcess.stderr.on('data', (payload) => {
          data += payload.toString()
        })
        expressionProcess.on('close', (code) => {
          data = data.trim()
          if (code && code > 0) {
            return resolve([code, data])
          }

          return resolve([0, data])
        })
      })

      if (isError) {
        window.showErrorMessage(`Failed to evaluate expression "${value}": ${data}`)
        return undefined
      }

      stateEnv[key] = data
    } else if (type === 'prompt') {
      /**
       * ask user for value only if placeholder has no new line as this would be absorbed by
       * VS Code, see https://github.com/microsoft/vscode/issues/98098
       */
      stateEnv[key] = populateEnvVar(
        (await promptUserForVariable(key, value, hasStringValue, false)) ?? '',
        { ...process.env, ...stateEnv },
      )
    } else {
      stateEnv[key] = populateEnvVar(value)
    }

    /**
     * we don't want to run these exports anymore as we already stored
     * them in our extension state
     */
    cellText = cellText.replace(match, '')

    /**
     * persist env variable in memory
     */
    ENV_STORE.set(key, stateEnv[key])
  }
  return cellText
}

export const sh = taskExecutor
export const bash = taskExecutor
