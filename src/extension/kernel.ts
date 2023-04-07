import {
  Disposable,
  notebooks,
  window,
  workspace,
  ExtensionContext,
  NotebookEditor,
  NotebookCell,
  NotebookCellKind,
  NotebookCellExecution,
  WorkspaceEdit,
  NotebookEdit,
  NotebookDocument,
  NotebookCellOutput,
  NotebookCellOutputItem,
  env,
  Uri
} from 'vscode'
import { TelemetryReporter } from 'vscode-telemetry'

import type { CellOutputPayload, ClientMessage, Serializer } from '../types'
import { ClientMessages, OutputType } from '../constants'
import { API } from '../utils/deno/api'
import {
  getNotebookTerminalFontFamily,
  getNotebookTerminalFontSize
} from '../utils/configuration'

import executor, { type IEnvironmentManager, ENV_STORE_MANAGER } from './executors'
import { DENO_ACCESS_TOKEN_KEY } from './constants'
import { resetEnv, getKey, getAnnotations, hashDocumentUri, processEnviron, isWindows } from './utils'
import './wasm/wasm_exec.js'
import { IRunner, IRunnerEnvironment } from './runner'
import { executeRunner } from './executors/runner'
import { ITerminalState, NotebookTerminalType, XTermState } from './terminal/terminalState'

enum ConfirmationItems {
  Yes = 'Yes',
  No = 'No',
  Skip = 'Skip Prompt and run all',
  Cancel = 'Cancel'
}

export class Kernel implements Disposable {
  static readonly type = 'runme' as const

  readonly #experiments = new Map<string, boolean>()

  #disposables: Disposable[] = []
  #controller = notebooks.createNotebookController(
    Kernel.type,
    Kernel.type,
    Kernel.type.toUpperCase()
  )
  protected messaging = notebooks.createRendererMessaging('runme-renderer')

  protected runner?: IRunner
  protected environment?: IRunnerEnvironment
  protected runnerReadyListener?: Disposable

  protected cellTerminalState = new WeakMap<NotebookCell, ITerminalState>()

  constructor(
    protected context: ExtensionContext,
  ) {
    const config = workspace.getConfiguration('runme.experiments')
    this.#experiments.set('grpcSerializer', config.get<boolean>('grpcSerializer', true))
    this.#experiments.set('grpcRunner', config.get<boolean>('grpcRunner', true))
    this.#experiments.set('grpcServer', config.get<boolean>('grpcServer', true))

    this.#controller.supportedLanguages = Object.keys(executor)
    this.#controller.supportsExecutionOrder = false
    this.#controller.description = 'Run your README.md'
    this.#controller.executeHandler = this._executeAll.bind(this)

    this.messaging.postMessage({ from: 'kernel' })
    this.#disposables.push(
      this.messaging.onDidReceiveMessage(this.#handleRendererMessage.bind(this)),
      workspace.onDidOpenNotebookDocument(this.#handleOpenNotebook.bind(this)),
      workspace.onDidSaveNotebookDocument(this.#handleSaveNotebook.bind(this)),
      window.onDidChangeActiveColorTheme(this.#handleActiveColorThemeMessage.bind(this)),
    )
  }

  hasExperimentEnabled(key: string, defaultValue?: boolean) {
    return this.#experiments.get(key) || defaultValue
  }

  dispose() {
    resetEnv()
    this.#controller.dispose()
    this.#disposables.forEach((d) => d.dispose())
    this.runnerReadyListener?.dispose()
  }

  getCellTerminalState(cell: NotebookCell): ITerminalState | undefined {
    return this.cellTerminalState.get(cell)
  }

  registerCellTerminalState(cell: NotebookCell, type: NotebookTerminalType): ITerminalState {
    let terminalState: ITerminalState

    switch (type) {
      case 'xterm': {
        terminalState = new XTermState()
      } break
    }

    this.cellTerminalState.set(cell, terminalState)

    return terminalState
  }

  getCellTerminalOutputPayload(cell: NotebookCell): NotebookCellOutput | undefined {
    const terminalState = this.getCellTerminalState(cell)
    if (!terminalState) { return }

    const cellId = getAnnotations(cell)['runme.dev/uuid']
    if (!cellId) { throw new Error('Cannot open cell terminal with invalid UUID!') }

    const editorSettings = workspace.getConfiguration('editor')

    const terminalFontFamily = getNotebookTerminalFontFamily() ?? editorSettings.get<string>('fontFamily', 'Arial')
    const terminalFontSize = getNotebookTerminalFontSize() ?? editorSettings.get<number>('fontSize', 10)

    const json: CellOutputPayload<OutputType.terminal> = {
      type: OutputType.terminal,
      output: {
        'runme.dev/uuid': cellId,
        terminalFontFamily,
        terminalFontSize,
        content: terminalState.serialize(),
      }
    }

    return new NotebookCellOutput([
      NotebookCellOutputItem.json(json, OutputType.terminal),
    ])
  }

  async #handleSaveNotebook({ uri, isUntitled, notebookType }: NotebookDocument) {
    if (notebookType !== Kernel.type) {
      return
    }
    const isReadme = uri.fsPath.toUpperCase().includes('README')
    const hashed = hashDocumentUri(uri.toString())
    TelemetryReporter.sendTelemetryEvent('notebook.save', {
      'notebook.hashedUri': hashed,
      'notebook.isReadme': isReadme.toString(),
      'notebook.isUntitled': isUntitled.toString(),
    })
  }


  async #handleOpenNotebook({ uri, isUntitled, notebookType }: NotebookDocument) {
    if (notebookType !== Kernel.type) {
      return
    }
    const isReadme = uri.fsPath.toUpperCase().includes('README')
    const hashed = hashDocumentUri(uri.toString())
    TelemetryReporter.sendTelemetryEvent('notebook.open', {
      'notebook.hashedUri': hashed,
      'notebook.isReadme': isReadme.toString(),
      'notebook.isUntitled': isUntitled.toString(),
    })
  }

  // eslint-disable-next-line max-len
  async #handleRendererMessage({ editor, message }: { editor: NotebookEditor, message: ClientMessage<ClientMessages> }) {
    if (message.type === ClientMessages.mutateAnnotations) {
      const payload =
        message as ClientMessage<ClientMessages.mutateAnnotations>

      let editCell: NotebookCell | undefined = undefined
      for (const document of workspace.notebookDocuments) {
        for (const cell of document.getCells()) {
          if (
            cell.kind !== NotebookCellKind.Code ||
            cell.document.uri.fsPath !== editor.notebook.uri.fsPath) {
            continue
          }

          if (cell.metadata?.['runme.dev/uuid'] === undefined) {
            console.error(`[Runme] Cell with index ${cell.index} lacks uuid`)
            continue
          }

          if (
            cell.metadata?.['runme.dev/uuid'] ===
            payload.output.annotations['runme.dev/uuid']
          ) {
            editCell = cell
            break
          }
        }

        if (editCell) {
          break
        }
      }

      if (editCell) {
        const edit = new WorkspaceEdit()
        const newMetadata = {
          ...editCell.metadata,
          ...payload.output.annotations,
        }
        const notebookEdit = NotebookEdit.updateCellMetadata(
          editCell.index,
          newMetadata
        )

        edit.set(editCell.notebook.uri, [notebookEdit])
        await workspace.applyEdit(edit)
      }

      return
    } else if (message.type === ClientMessages.promote) {
      const payload = message as ClientMessage<ClientMessages.promote>
      const token = await this.getEnvironmentManager().get(DENO_ACCESS_TOKEN_KEY)
      if (!token) {
        return
      }

      const api = API.fromToken(token)
      const deployed = await api.promoteDeployment(
        payload.output.id,
        payload.output.productionDeployment
      )
      this.messaging.postMessage(<ClientMessage<ClientMessages.deployed>>{
        type: ClientMessages.deployed,
        output: deployed,
      })
    } else if (message.type === ClientMessages.prod) {
      const payload = message as ClientMessage<ClientMessages.prod>
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const cell = editor.notebook.cellAt(payload.output.cellIndex)
      if (cell.executionSummary?.success) {
        process.env['vercelProd'] = 'true'
        return this._doExecuteCell(cell)
      }
    } else if (message.type === ClientMessages.infoMessage) {
      return window.showInformationMessage(message.output as string)
    } else if (message.type === ClientMessages.errorMessage) {
      return window.showInformationMessage(message.output as string)
    } else if (message.type === ClientMessages.openLink) {
      return env.openExternal(Uri.parse(message.output))
    } else if (
      message.type === ClientMessages.terminalStdin ||
      message.type === ClientMessages.terminalStdout ||
      message.type === ClientMessages.terminalStderr
    ) {
      return
    }

    console.error(`[Runme] Unknown kernel event type: ${message.type}`)
  }

  private async _executeAll(cells: NotebookCell[]) {
    const totalNotebookCells = (
      cells[0] &&
      cells[0].notebook.getCells().filter((cell) => cell.kind === NotebookCellKind.Code).length
    ) || 0
    const totalCellsToExecute = cells.length
    let showConfirmPrompt = totalNotebookCells === totalCellsToExecute && totalNotebookCells > 1
    let cellsExecuted = 0

    for (const cell of cells) {
      if (showConfirmPrompt) {
        const annotations = getAnnotations(cell)
        const cellText = cell.document.getText()
        const cellLabel = (
          annotations.name ||
            cellText.length > 20 ? `${cellText.slice(0, 20)}...` : cellText
        )

        const answer = await window.showQuickPick(Object.values(ConfirmationItems), {
          title: `Are you sure you like to run "${cellLabel}"?`,
          ignoreFocusOut: true
        }) as ConfirmationItems | undefined

        if (answer === ConfirmationItems.No) {
          continue
        }

        if (answer === ConfirmationItems.Skip) {
          showConfirmPrompt = false
        }

        if (answer === ConfirmationItems.Cancel) {
          TelemetryReporter.sendTelemetryEvent('cells.executeAll', {
            'cells.total': totalNotebookCells?.toString(),
            'cells.executed': cellsExecuted?.toString(),
          })
          return
        }
      }

      await this._doExecuteCell(cell)
      cellsExecuted++
    }

    TelemetryReporter.sendTelemetryEvent('cells.executeAll', {
      'cells.total': totalNotebookCells?.toString(),
      'cells.executed': cellsExecuted?.toString(),
    })
  }

  #handleActiveColorThemeMessage(): void {
    this.messaging.postMessage(<ClientMessage<ClientMessages.activeThemeChanged>>{
      type: ClientMessages.activeThemeChanged,
    })
  }

  public async createCellExecution(cell: NotebookCell): Promise<NotebookCellExecution> {
    return this.#controller.createNotebookCellExecution(cell)
  }

  private async _doExecuteCell(cell: NotebookCell): Promise<void> {
    const runningCell = cell.document
    const exec = await this.createCellExecution(cell)

    const uuid = (cell.metadata as Serializer.Metadata)['runme.dev/uuid']

    if (!uuid) {
      throw new Error('Executable cell does not have UUID field!')
    }

    TelemetryReporter.sendTelemetryEvent('cell.startExecute')
    exec.start(Date.now())
    let execKey = getKey(runningCell)

    let successfulCellExecution: boolean

    const environmentManager = this.getEnvironmentManager()

    if (
      this.runner &&
      // hard disable gRPC runner on windows
      // TODO(mxs): support windows shells
      !isWindows()
    ) {
      const runScript = async (execKey: 'sh' | 'bash' = 'bash') => await executeRunner(
        this,
        this.context,
        this.runner!,
        exec,
        runningCell,
        this.messaging,
        uuid,
        execKey,
        this.environment,
        environmentManager
      )
        .catch((e) => {
          window.showErrorMessage(`Internal failure executing runner: ${e.message}`)
          console.error('[Runme] Internal failure executing runner', e.message)
          return false
        })

      if (execKey === 'bash' || execKey === 'sh') {
        successfulCellExecution = await runScript(execKey)
      } else {
        successfulCellExecution = await executor[execKey].call(
          this, exec, runningCell, runScript, environmentManager
        )
      }
    } else {
      /**
       * check if user is running experiment to execute shell via runme cli
       */
      successfulCellExecution = await executor[execKey].call(this, exec, runningCell)
    }
    TelemetryReporter.sendTelemetryEvent('cell.endExecute', { 'cell.success': successfulCellExecution?.toString() })
    exec.end(successfulCellExecution)
  }

  useRunner(runner: IRunner) {
    this.runnerReadyListener?.dispose()

    if (this.hasExperimentEnabled('grpcRunner') && runner) {
      this.runner = runner

      this.runnerReadyListener = runner.onReady(async () => {
        this.environment = undefined

        try {
          const env = await runner.createEnvironment(
            // copy env from process naively for now
            // later we might want a more sophisticated approach/to bring this serverside
            processEnviron()
          )

          if (this.runner !== runner) { return }
          this.environment = env
        } catch (e: any) {
          window.showErrorMessage(`Failed to create environment for gRPC Runner: ${e.message}`)
          console.error('[Runme] Failed to create gRPC Runner environment', e)
        }
      })
    }
  }

  getRunnerEnvironment(): IRunnerEnvironment | undefined {
    return this.environment
  }

  // TODO: use better abstraction as part of move away from executor model
  private getEnvironmentManager(): IEnvironmentManager {
    if (this.runner) {
      return {
        get: async (key) => {
          if (!this.environment) { return undefined }
          return (await this.runner?.getEnvironmentVariables(this.environment))?.[key]
        },
        set: async (key, val) => {
          if (!this.environment) { return undefined }
          await this.runner?.setEnvironmentVariables(this.environment, { [key]: val })
        }
      }
    } else {
      return ENV_STORE_MANAGER
    }
  }
}
