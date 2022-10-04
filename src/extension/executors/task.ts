import path from 'node:path'
import { writeFile, chmod } from 'node:fs/promises'

import {
  Task, ShellExecution, TextDocument, NotebookCellExecution, TaskScope, tasks,
  window, TerminalOptions, commands, ExtensionContext, TaskRevealKind, TaskPanelKind,
  workspace
} from 'vscode'
import { file } from 'tmp-promise'

import { sh as inlineSh } from './shell'

const LABEL_LIMIT = 15

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
  /**
   * run as non interactive shell script if set as configuration or annotated
   * in markdown section
   */
  const config = workspace.getConfiguration('runme')
  if (!config.get('shell.interactive') || exec.cell.metadata.attributes?.interactive === 'false') {
    return inlineSh(context, exec, doc)
  }

  const scriptFile = await file()
  const cellText = doc.getText()
  const splits = scriptFile.path.split('-')
  const id = splits[splits.length-1]
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
      // eslint-disable-next-line @typescript-eslint/naming-convention
      env: { RUNME_TASK: 'true' }
    }),
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
      (resolve) => setTimeout(() => resolve(true), 2000))

    return Promise.race([
      p.then((exitCode) => exitCode === 0),
      giveItTime,
    ])
  }

  return !Boolean(await p)
}

export const sh = taskExecutor
export const bash = taskExecutor
