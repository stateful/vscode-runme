import path from 'node:path'
import { mkdirSync, readFileSync, unlinkSync } from 'node:fs'

import { fetch } from 'undici'
import vscode from 'vscode'
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
import { getNamespacedMid, isWindows } from './utils'
import getLogger from './logger'

const log = getLogger('WinDefaultShell')

abstract class Survey implements Disposable {
  private readonly id: string
  protected readonly tempDir: Uri
  protected readonly context: ExtensionContext
  protected readonly disposables: Disposable[] = []

  constructor(context: ExtensionContext, id: string) {
    this.id = id
    this.tempDir = context.globalStorageUri
    this.context = context
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose())
  }

  protected async undo() {
    await this.context.globalState.update(this.id, false)
  }

  protected async done() {
    await this.context.globalState.update(this.id, true)
  }
}

export class WinDefaultShell extends Survey {
  static readonly #id: string = 'runme.surveyWinDefaultShell'

  constructor(context: ExtensionContext) {
    super(context, WinDefaultShell.#id)
    commands.registerCommand(WinDefaultShell.#id, this.prompt.bind(this))

    // Only prompt on Windows
    if (!isWindows()) {
      return
    }

    this.disposables.push(workspace.onDidOpenNotebookDocument(this.#handleOpenNotebook.bind(this)))
  }

  async #handleOpenNotebook({ notebookType }: NotebookDocument) {
    if (
      notebookType !== Kernel.type ||
      this.context.globalState.get<boolean>(WinDefaultShell.#id, false)
    ) {
      return
    }

    await new Promise<void>((resolve) => setTimeout(resolve, 2000))
    await commands.executeCommand(WinDefaultShell.#id, false)
  }

  async prompt(runDirect = true) {
    // reset done when run from command palette
    if (runDirect) {
      await this.undo()
    }

    const option = await window.showInformationMessage(
      'Please help us improve Runme on Windows: Click OK to share what default shell you are using.',
      'OK',
      "Don't ask again",
      'Dismiss'
    )
    if (option === 'Dismiss' || option === undefined) {
      return
    } else if (option !== 'OK') {
      await this.done()
      return
    }

    mkdirSync(this.tempDir.fsPath, { recursive: true })

    const name = 'Runme Windows Shell'
    const tmpfile = path.join(this.tempDir.fsPath, 'defaultShell')
    try {
      unlinkSync(tmpfile)
    } catch (err) {
      if (err instanceof Error) {
        log.error(`Failed to remove temporary default shell: ${err.message}`)
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
      panel: TaskPanelKind.Dedicated,
    }

    const exitCode = await new Promise<number>((resolve) => {
      tasks.executeTask(taskExecution).then((execution) => {
        this.disposables.push(
          tasks.onDidEndTaskProcess((e) => {
            const taskId = (e.execution as any)['_id']
            const executionId = (execution as any)['_id']

            if (taskId !== executionId || typeof e.exitCode === 'undefined') {
              return
            }

            // non-zero exit code does not mean failure
            resolve(e.exitCode)
          })
        )
      })
    })

    try {
      const output = readFileSync(tmpfile, { encoding: 'utf-8' }).trim()
      TelemetryReporter.sendTelemetryEvent('survey.WinDefaultShell', {
        output,
        exitCode: exitCode.toString(),
      })
      await this.done()
      unlinkSync(tmpfile)
    } catch (err) {
      if (err instanceof Error) {
        log.error(`Failed to remove temporary default shell: ${err.message}`)
      }
    }
  }
}

export class SurveyWinCodeLensRun implements Disposable {
  static readonly #id: string = 'runme.surveyWinCodeLensRun'

  constructor(protected context: ExtensionContext) {}

  shouldPrompt() {
    return isWindows()
  }

  async prompt(): Promise<void> {
    if (
      this.context.globalState.get<boolean>(SurveyWinCodeLensRun.#id, false) ||
      !this.shouldPrompt()
    ) {
      return
    }

    const option = await window.showInformationMessage(
      // eslint-disable-next-line max-len
      'Support for running scripts directly from markdown is currently not supported on Windows.\nPlease help us improve Runme on Windows: Click OK to share your interest in this feature.',
      'OK',
      "Don't ask again",
      'Dismiss'
    )

    switch (option) {
      case 'OK':
        {
          TelemetryReporter.sendTelemetryEvent('survey.WinCodeLensRun', {})
        }
        break

      case 'Dismiss': {
        return
      }
    }

    await this.#done()
  }

  async #done() {
    await this.context.globalState.update(SurveyWinCodeLensRun.#id, true)
  }

  dispose() {}
}

export class SurveyActiveUserFeedback extends Survey {
  static readonly #id: string = 'runme.surveyActiveUserFeedback'
  readonly #mid: string
  #displayed: boolean = false

  constructor(protected context: ExtensionContext) {
    super(context, SurveyActiveUserFeedback.#id)
    this.#mid = getNamespacedMid(SurveyActiveUserFeedback.#id)

    commands.registerCommand(SurveyActiveUserFeedback.#id, this.prompt.bind(this))

    this.disposables.push(workspace.onDidOpenNotebookDocument(this.#handleOpenNotebook.bind(this)))
  }

  async #handleOpenNotebook({ notebookType }: NotebookDocument) {
    if (
      notebookType !== Kernel.type ||
      this.context.globalState.get<boolean>(SurveyActiveUserFeedback.#id, false) ||
      // display only once per session
      this.#displayed
    ) {
      return
    }

    try {
      const response = await fetch(
        `https://runme.dev/api/survey?name=feedback&mid=${vscode.env.machineId}`
      )
      if (response.status === 404) {
        // no match, try again next session
        this.#displayed = true
        return
      } else if (response.status !== 200) {
        throw new Error(`http status ${response.status}: ${response.statusText}`)
      }
    } catch (err) {
      this.#displayed = true // try again next session
      if (err instanceof Error) {
        log.error(`Failed to fetch survey route: ${err.message}`)
      }
      return
    }

    await new Promise<void>((resolve) => setTimeout(resolve, 2000))
    await commands.executeCommand(SurveyActiveUserFeedback.#id, false)
  }

  async prompt(runDirect = true) {
    // reset done when run from command palette
    if (runDirect) {
      this.#displayed = false
      await this.undo()
    }

    const option = await window.showInformationMessage(
      "We'd love to hear how we can improve Runme for you. Please click OK to open the feedback form. Takes <1min.",
      'OK',
      "Don't ask again",
      'Dismiss'
    )
    this.#displayed = true
    if (option === 'Dismiss' || option === undefined) {
      return
    } else if (option !== 'OK') {
      TelemetryReporter.sendTelemetryEvent('survey.ActiveUserFeedback', {
        never: 'true',
      })
      await this.done()
      return
    }

    TelemetryReporter.sendTelemetryEvent('survey.ActiveUserFeedback', {
      never: 'false',
    })
    await commands.executeCommand(
      'vscode.open',
      Uri.parse(`https://wfoq097ak2p.typeform.com/runme#mid=${this.#mid}`)
    )
    await this.done()
  }
}
