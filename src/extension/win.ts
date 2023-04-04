import path from 'node:path'
import { readFileSync, unlinkSync } from 'node:fs'

import {
  Disposable,
  NotebookDocument,
  workspace,
  window,
  ExtensionContext,
  Task,
  TaskScope,
  ShellExecution,
  TaskRevealKind,
  TaskPanelKind,
  tasks,
  Uri,
  commands,
} from 'vscode'
import { TelemetryReporter } from 'vscode-telemetry'

import { Kernel } from './kernel'
import { isWindows } from './utils'

export class Survey implements Disposable {
  readonly #tmpDir: Uri
  readonly #context: ExtensionContext
  readonly #disposables: Disposable[] = []

  constructor(context: ExtensionContext) {
    this.#tmpDir = context.globalStorageUri
    this.#context = context
    // negate Windows check once ready
    if (isWindows()) {
      return
    }

    commands.registerCommand('runme.surveyWinDefaultShell', this.#prompt.bind(this))

    this.#disposables.push(
      workspace.onDidOpenNotebookDocument(this.#handleOpenNotebook.bind(this))
    )
  }

  async #handleOpenNotebook({ notebookType }: NotebookDocument) {
    if (
      notebookType !== Kernel.type ||
      this.#context.globalState.get<boolean>(
        'runme.winSurvey.defaultShell',
        false
      )
    ) {
      return
    }

    await new Promise<void>(resolve => setTimeout(resolve, 2000))
    await commands.executeCommand('runme.surveyWinDefaultShell')
  }

  async #prompt() {
    const option = await window.showInformationMessage(
      'Please help us improve Runme on Windows: Click OK to share what default shell you are running.',
      'OK',
      'Dismiss'
    )
    if (option !== 'OK') {
      return
    }


    const name = 'Runme Windows Shell'
    const tmpfile = path.join(this.#tmpDir.fsPath, 'defaultShell')
    try {
      unlinkSync(tmpfile)
    } catch (err) {
      if (err instanceof Error) {
        console.log(err.message)
      }
    }
    // eslint-disable-next-line max-len
    const cmdline = `echo $SHELL > "${tmpfile}"; echo $PSVersionTable | Out-File -Encoding utf8 "${tmpfile}"`
    const taskExecution = new Task(
      { type: 'shell', name },
      TaskScope.Workspace,
      name,
      'exec',
      new ShellExecution(cmdline)
    )

    taskExecution.isBackground = true
    taskExecution.presentationOptions = {
      focus: false,
      reveal: TaskRevealKind.Never,
      panel: TaskPanelKind.Dedicated
    }

    await new Promise<number>((resolve) => {
      tasks.executeTask(taskExecution).then((execution) => {
        this.#disposables.push(tasks.onDidEndTaskProcess((e) => {
          const taskId = (e.execution as any)['_id']
          const executionId = (execution as any)['_id']

          if (
            taskId !== executionId ||
            typeof e.exitCode === 'undefined'
          ) {
            return
          }

          // non-zero exit code does not mean failure
          resolve(e.exitCode)
        }))
      })
    })

    try {
      const output = readFileSync(tmpfile, { encoding: 'utf-8' }).trim()
      TelemetryReporter.sendTelemetryEvent('winSurvey.defaultShell', { output })
      unlinkSync(tmpfile)
    } catch (err) {
      if (err instanceof Error) {
        console.log(err.message)
      }
    }
  }

  dispose() {
    this.#disposables.forEach(d => d.dispose())
  }
}
