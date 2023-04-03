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
    await this.#prompt()
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
    const cmdline = `rm "${tmpfile}"; echo $SHELL > "${tmpfile}"; echo $PSVersionTable >> "${tmpfile}"`
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
    await tasks.executeTask(taskExecution)

    // let buffer = ''
    // const child = spawn('echo $SHELL; echo $PSVersionTable', { shell: true, env })
    // const concat = (buf: Uint8Array) => buffer += buf.toString()
    // child.stdout.on('data', concat)
    // child.stderr.on('data', concat)

    // const output = await new Promise<string>((resolve, reject) => {
    //   child.on('exit', (exitCode) => {
    //     if (exitCode === 0) {
    //       resolve(buffer.trim())
    //       return
    //     }
    //     reject(exitCode?.toString())
    //   })
    // })

    const output = readFileSync(tmpfile, { encoding: 'utf-8' }).trim()
    TelemetryReporter.sendTelemetryEvent('winSurvey.defaultShell', { output })
    unlinkSync(tmpfile)
  }

  dispose() {
    this.#disposables.forEach(d => d.dispose())
  }
}
