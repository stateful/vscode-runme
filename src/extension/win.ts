import { spawn } from 'node:child_process'
import { env } from 'node:process'

import { Disposable, NotebookDocument, workspace, window, ExtensionContext } from 'vscode'
import { TelemetryReporter } from 'vscode-telemetry'

import { Kernel } from './kernel'
import { isWindows } from './utils'

export class Survey implements Disposable {
  readonly #context: ExtensionContext
  readonly #disposables: Disposable[] = []

  constructor(context: ExtensionContext) {
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

    let buffer = ''
    const child = spawn('echo $SHELL; echo $PSVersionTable', { shell: true, env })
    const concat = (buf: Uint8Array) => buffer += buf.toString()
    child.stdout.on('data', concat)
    child.stderr.on('data', concat)

    const output = await new Promise<string>((resolve, reject) => {
      child.on('exit', (exitCode) => {
        if (exitCode === 0) {
          resolve(buffer.trim())
          return
        }
        reject(exitCode?.toString())
      })
    })

    TelemetryReporter.sendTelemetryEvent('winSurvey.defaultShell', { output })
  }

  dispose() {
    this.#disposables.forEach(d => d.dispose())
  }
}
