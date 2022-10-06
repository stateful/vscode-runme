import path from 'node:path'
import { writeFile, chmod } from 'node:fs/promises'

import {
  Task, TextDocument, NotebookCellExecution, TaskScope, tasks,
  window, TerminalOptions, commands, ExtensionContext, TaskRevealKind, TaskPanelKind,
  workspace,
  // CustomExecution,
  // Pseudoterminal,
  ShellExecution
} from 'vscode'
import { file } from 'tmp-promise'

import { STATE_KEY_FOR_ENV_VARS } from '../../constants'

// import { ExperimentalTerminal } from "../terminal"
import { sh as inlineSh } from './shell'

const BACKGROUND_TASK_HIDE_TIMEOUT = 2000
const LABEL_LIMIT = 15
const EXPORT_REGEX = /(\n*)export \w+=("*)(.+?)(?=(\n|"))/g

export function closeTerminalByScript () {
  const terminal = window.terminals.find((t) => (
    t.creationOptions as TerminalOptions).env?.RUNME_TASK)
  if (terminal) {
    terminal.hide()
  }
}

async function taskExecutor(
  context: ExtensionContext,
  exec: NotebookCellExecution,
  doc: TextDocument
): Promise<boolean> {
  let cellText = doc.getText()

  /**
   * find export commands
   */
  const exportMatches = (exec.cell.metadata.source.match(EXPORT_REGEX) || []).map((m: string) => m.trim())
  const stateEnv: Record<string, string> = context.globalState.get(STATE_KEY_FOR_ENV_VARS, {})
  for (const e of exportMatches) {
    const [key, ph] = e.slice('export '.length).split('=')
    const placeHolder = ph.startsWith('"') ? ph.slice(1) : ph
    stateEnv[key] = await window.showInputBox({
      title: `Set Environment Variable "${key}"`,
      placeHolder,
      prompt: 'Your shell script wants to set some environment variables, please enter them here.'
    }) || ''

    /**
     * we don't want to run these exports anymore as we already stored
     * them in our extension state
     */
    cellText = cellText.replace(
      /**
       * In case of `export foo="bar", our match includes the preceeding '"' but not
       * the ending one. To properly cut out the line from the script we need to add
       * it back again.
       */
      e + (ph.startsWith('"') ? '"' : ''),
      ''
    )
  }
  await context.globalState.update(STATE_KEY_FOR_ENV_VARS, stateEnv)

  /**
   * run as non interactive shell script if set as configuration or annotated
   * in markdown section
   */
  const config = workspace.getConfiguration('runme')
  if (!config.get('shell.interactive') || exec.cell.metadata.attributes?.interactive === 'false') {
    return inlineSh(context, exec, doc)
  }

  const scriptFile = await file()
  const splits = scriptFile.path.split('-')
  const id = splits[splits.length-1]
  const RUNME_ID = `${doc.fileName}:${exec.cell.index}`

  await writeFile(scriptFile.path, cellText, 'utf-8')
  await chmod(scriptFile.path, 0o775)

  const taskExecution = new Task(
    { type: 'runme', name: `Runme Task (${id})` },
    TaskScope.Workspace,
    cellText.length > LABEL_LIMIT
      ? `${cellText.slice(0, LABEL_LIMIT)}...`
      : cellText,
    'exec',
    new ShellExecution(scriptFile.path, {
      cwd: path.dirname(doc.uri.path),
      env: {
        ...process.env,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        RUNME_TASK: 'true',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        RUNME_ID,
        ...stateEnv
      }
    }),
    // experimental only
    // new CustomExecution(async (): Promise<Pseudoterminal> => {
    //   return new ExperimentalTerminal(scriptFile.path, {
    //     cwd: path.dirname(doc.uri.path),
    //     // eslint-disable-next-line @typescript-eslint/naming-convention
    //     env: { RUNME_TASK: "true", RUNME_ID },
    //   })
    // })
  )
  const isBackground = exec.cell.metadata.attributes?.['background'] === 'true'
  taskExecution.isBackground = isBackground
  taskExecution.presentationOptions = {
    focus: true,
    // why doesn't this work with Slient?
    reveal: isBackground ? TaskRevealKind.Always : TaskRevealKind.Always,
    panel: isBackground ? TaskPanelKind.Dedicated : TaskPanelKind.Shared
  }
  await commands.executeCommand('workbench.action.terminal.clear')
  const execution = await tasks.executeTask(taskExecution)

  const p = new Promise<number>((resolve) => {
    exec.token.onCancellationRequested(() => {
      try {
        execution.terminate()
        closeTerminalByScript()
        resolve(0)
      } catch (err: any) {
        console.error(`[Runme] Failed to terminate task: ${(err as Error).message}`)
        resolve(1)
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
       * only close terminal if execution passed
       */
      if (e.exitCode === 0) {
        closeTerminalByScript()
      }

      return resolve(e.exitCode)
    })
  })

  if (isBackground) {
    const giveItTime = new Promise<boolean>(
      (resolve) => setTimeout(() => {
        closeTerminalByScript()
        return resolve(true)
      }, BACKGROUND_TASK_HIDE_TIMEOUT))

    return Promise.race([
      p.then((exitCode) => exitCode === 0),
      giveItTime,
    ])
  }

  return !Boolean(await p)
}

export const sh = taskExecutor
export const bash = taskExecutor
