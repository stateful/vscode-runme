import {
  Disposable,
  notebooks,
  window,
  workspace,
  ExtensionContext,
  NotebookEditor,
  NotebookCell,
  NotebookCellKind,
  WorkspaceEdit,
  NotebookEdit,
  NotebookDocument,
  env,
  Uri,
  commands,
} from 'vscode'
import { TelemetryReporter } from 'vscode-telemetry'

import type { ClientMessage, Serializer } from '../types'
import { ClientMessages, NOTEBOOK_HAS_CATEGORIES } from '../constants'
import { API } from '../utils/deno/api'
import { postClientMessage } from '../utils/messaging'

import getLogger from './logger'
import executor, { type IEnvironmentManager, ENV_STORE_MANAGER } from './executors'
import { DENO_ACCESS_TOKEN_KEY } from './constants'
import {
  resetEnv,
  getKey,
  getAnnotations,
  hashDocumentUri,
  processEnviron,
  isWindows,
  setNotebookCategories,
} from './utils'
import './wasm/wasm_exec.js'
import { IRunner, IRunnerEnvironment } from './runner'
import { executeRunner } from './executors/runner'
import { ITerminalState, NotebookTerminalType } from './terminal/terminalState'
import { NotebookCellManager, NotebookCellOutputManager, RunmeNotebookCellExecution, getCellByUuId } from './cell'
import { handleCellOutputMessage } from './messages/cellOutput'
import handleGitHubMessage from './messages/github'
import { getNotebookCategories } from './utils'
import handleApiMessage from './messages/apiRequest'

enum ConfirmationItems {
  Yes = 'Yes',
  No = 'No',
  Skip = 'Skip Prompt and run all',
  Cancel = 'Cancel'
}

const log = getLogger('Kernel')

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

  protected cellManager = new NotebookCellManager(this.#controller)
  protected category?: string

  constructor(
    protected context: ExtensionContext
  ) {
    const config = workspace.getConfiguration('runme.experiments')
    this.#experiments.set('grpcSerializer', config.get<boolean>('grpcSerializer', true))
    this.#experiments.set('grpcRunner', config.get<boolean>('grpcRunner', true))
    this.#experiments.set('grpcServer', config.get<boolean>('grpcServer', true))

    this.#controller.supportedLanguages = Object.keys(executor)
    this.#controller.supportsExecutionOrder = false
    this.#controller.description = 'Run your Markdown'
    this.#controller.executeHandler = this._executeAll.bind(this)

    this.messaging.postMessage({ from: 'kernel' })
    this.#disposables.push(
      this.messaging.onDidReceiveMessage(this.#handleRendererMessage.bind(this)),
      workspace.onDidOpenNotebookDocument(this.#handleOpenNotebook.bind(this)),
      workspace.onDidSaveNotebookDocument(this.#handleSaveNotebook.bind(this)),
      window.onDidChangeActiveColorTheme(this.#handleActiveColorThemeMessage.bind(this)),
      window.onDidChangeActiveNotebookEditor(this.#handleActiveNotebook.bind(this))
    )
  }

  registerNotebookCell(cell: NotebookCell) {
    this.cellManager.registerCell(cell)
  }
  setCategory(category: string) {
    this.category = category
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

  async getTerminalState(cell: NotebookCell): Promise<ITerminalState | undefined> {
    return (await this.getCellOutputs(cell)).getCellTerminalState()
  }

  async registerCellTerminalState(cell: NotebookCell, type: NotebookTerminalType): Promise<ITerminalState> {
    const outputs = await this.cellManager.getNotebookOutputs(cell)
    return outputs.registerCellTerminalState(type)
  }

  async #handleSaveNotebook({ uri, isUntitled, notebookType, getCells }: NotebookDocument) {
    if (notebookType !== Kernel.type) {
      return
    }
    const availableCategories: string[] = []
    getCells().forEach((cell) => {
      const annotations = getAnnotations(cell)
      if (annotations.category !== '' && !availableCategories.includes(annotations.category)) {
        availableCategories.push(annotations.category)
      }
    })
    setNotebookCategories(this.context, uri, availableCategories)
    await commands.executeCommand('setContext', NOTEBOOK_HAS_CATEGORIES, !!availableCategories.length)
    const isReadme = uri.fsPath.toUpperCase().includes('README')
    const hashed = hashDocumentUri(uri.toString())

    TelemetryReporter.sendTelemetryEvent('notebook.save', {
      'notebook.hashedUri': hashed,
      'notebook.isReadme': isReadme.toString(),
      'notebook.isUntitled': isUntitled.toString(),
    })
  }

  async #handleOpenNotebook(notebookDocument: NotebookDocument) {
    const { uri, isUntitled, notebookType, getCells } = notebookDocument
    if (notebookType !== Kernel.type) {
      return
    }
    const availableCategories: string[] = []
    getCells().forEach((cell) => {
      const annotations = getAnnotations(cell)
      if (annotations.category !== '' && !availableCategories.includes(annotations.category)) {
        availableCategories.push(annotations.category)
      }
      this.registerNotebookCell(cell)
    })
    setNotebookCategories(this.context, uri, availableCategories)
    const isReadme = uri.fsPath.toUpperCase().includes('README')
    const hashed = hashDocumentUri(uri.toString())
    TelemetryReporter.sendTelemetryEvent('notebook.open', {
      'notebook.hashedUri': hashed,
      'notebook.isReadme': isReadme.toString(),
      'notebook.isUntitled': isUntitled.toString(),
    })
  }

  async #handleActiveNotebook(listener: NotebookEditor | undefined) {
    const notebookDocument = listener?.notebook
    if (!notebookDocument || notebookDocument.notebookType !== Kernel.type) {
      return
    }
    const { uri } = notebookDocument
    const categories = await getNotebookCategories(this.context, uri)
    await commands.executeCommand('setContext', NOTEBOOK_HAS_CATEGORIES, !!categories.length)
  }

  // eslint-disable-next-line max-len
  async #handleRendererMessage({
    editor,
    message,
  }: {
    editor: NotebookEditor
    message: ClientMessage<ClientMessages>
  }) {
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
            log.error(`Cell with index ${cell.index} lacks uuid`)
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
    } else if (message.type === ClientMessages.denoPromote) {
      const payload = message
      const token = await this.getEnvironmentManager().get(DENO_ACCESS_TOKEN_KEY)
      if (!token) {
        return
      }

      const api = API.fromToken(token)
      const deployed = await api.promoteDeployment(
        payload.output.id,
        payload.output.productionDeployment
      )
      postClientMessage(this.messaging, ClientMessages.denoUpdate, {
        promoted: deployed.valueOf()
      })
    } else if (message.type === ClientMessages.vercelProd) {
      const payload = message as ClientMessage<ClientMessages.vercelProd>
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const cell = editor.notebook.cellAt(payload.output.cellIndex)
      if (cell.executionSummary?.success) {
        process.env['vercelProd'] = 'true'
        return this._doExecuteCell(cell)
      }
    } else if (message.type === ClientMessages.infoMessage) {
      return window.showInformationMessage(message.output as string,)
    } else if (message.type === ClientMessages.errorMessage) {
      return window.showErrorMessage(message.output as string)
    } else if (message.type === ClientMessages.openLink) {
      return env.openExternal(Uri.parse(message.output))
    } else if (message.type === ClientMessages.closeCellOutput) {
      const cell = await getCellByUuId({ editor, uuid: message.output.uuid })
      if (!cell) {
        return
      }
      return handleCellOutputMessage({
        message,
        cell,
        kernel: this,
        outputType: message.output.outputType
      })
    } else if (message.type === ClientMessages.githubWorkflowDispatch) {
      await handleGitHubMessage({ messaging: this.messaging, message })
    } else if (message.type === ClientMessages.displayPrompt) {
      const answer = await window.showInputBox({
        password: message.output.isSecret,
        placeHolder: message.output.placeholder,
        title: message.output.title,
      })
      const cell = await getCellByUuId({ editor, uuid: message.output.uuid })
      if (!cell || message.output.uuid !== cell.metadata?.['runme.dev/uuid']) {
        return
      }
      postClientMessage(this.messaging, ClientMessages.onPrompt, {
        answer,
        uuid: message.output.uuid
      })
    } else if (message.type === ClientMessages.getState) {
      const cell = await getCellByUuId({ editor, uuid: message.output.uuid })
      if (!cell) {
        return
      }
      const categories = await getNotebookCategories(this.context, cell.notebook.uri)
      if (!categories) {
        return
      }
      postClientMessage(this.messaging, ClientMessages.onGetState, {
        state: message.output.state,
        value: categories,
        uuid: message.output.uuid
      })
    } else if (message.type === ClientMessages.setState) {
      const cell = await getCellByUuId({ editor, uuid: message.output.uuid })
      if (!cell) {
        return
      }
      await setNotebookCategories(this.context, cell.notebook.uri, message.output.value)
    } else if (message.type === ClientMessages.displayPicker) {
      const selectedOption = await window.showQuickPick(message.output.options, {
        title: message.output.title,
        ignoreFocusOut: true,
      })
      postClientMessage(this.messaging, ClientMessages.onPickerOption, {
        option: selectedOption,
        uuid: message.output.uuid
      })
    } else if (message.type === ClientMessages.apiRequest) {
      return handleApiMessage({
        messaging: this.messaging,
        message,
        editor
      })
    } else if (message.type === ClientMessages.optionsMessage) {
      const answer = await window.showInformationMessage(message.output.title, ...message.output.options)
      return postClientMessage(this.messaging, ClientMessages.onOptionsMessage, {
        option: answer,
        uuid: message.output.uuid
      })
    } else if (message.type === ClientMessages.copyTextToClipboard) {
      await env.clipboard.writeText(message.output.text)
      return postClientMessage(this.messaging, ClientMessages.onCopyTextToClipboard, {
        uuid: message.output.uuid
      })
    } else if (message.type === ClientMessages.openExternalLink) {
      return env.openExternal(Uri.parse(message.output))
    } else if (
      message.type.startsWith('terminal:')
    ) {
      return
    }

    log.error(`Unknown kernel event type: ${message.type}`)
  }

  private async _executeAll(cells: NotebookCell[]) {
    await commands.executeCommand('setContext', NOTEBOOK_HAS_CATEGORIES, false)
    const totalNotebookCells =
      (cells[0] && cells[0].notebook.getCells().filter((cell) => cell.kind === NotebookCellKind.Code).length) || 0
    const totalCellsToExecute = cells.length
    let showConfirmPrompt = totalNotebookCells === totalCellsToExecute && totalNotebookCells > 1
    let cellsExecuted = 0

    for (const cell of cells) {
      const annotations = getAnnotations(cell)
      if (totalCellsToExecute > 1 &&
        (this.category && annotations.category !== this.category) ||
        (annotations.excludeFromRunAll)
      ) {
        continue
      }
      if (showConfirmPrompt) {
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
    this.category = undefined
    const uri = cells[0] && cells[0].notebook.uri
    const categories = await getNotebookCategories(this.context, uri)
    await commands.executeCommand('setContext', NOTEBOOK_HAS_CATEGORIES, !!categories.length)

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

  public async createCellExecution(cell: NotebookCell): Promise<RunmeNotebookCellExecution | undefined> {
    return await this.cellManager.createNotebookCellExecution(cell)
  }

  public async getCellOutputs(cell: NotebookCell): Promise<NotebookCellOutputManager> {
    return await this.cellManager.getNotebookOutputs(cell)
  }

  private async _doExecuteCell(cell: NotebookCell): Promise<void> {
    const runningCell = await workspace.openTextDocument(cell.document.uri)
    const runmeExec = await this.createCellExecution(cell)

    if (!runmeExec) {
      log.warn('Unable to create execution')
      return
    }

    const exec = runmeExec.underlyingExecution

    const uuid = (cell.metadata as Serializer.Metadata)['runme.dev/uuid']

    if (!uuid) {
      throw new Error('Executable cell does not have UUID field!')
    }

    TelemetryReporter.sendTelemetryEvent('cell.startExecute')
    runmeExec.start(Date.now())
    let execKey = getKey(runningCell)

    let successfulCellExecution: boolean

    const environmentManager = this.getEnvironmentManager()
    const outputs = await this.getCellOutputs(cell)

    if (
      this.runner &&
      // hard disable gRPC runner on windows
      // TODO(mxs): support windows shells
      !isWindows()
    ) {
      const runScript = (execKey: 'sh' | 'bash' = 'bash') => executeRunner(
        this,
        this.context,
        this.runner!,
        exec,
        runningCell,
        this.messaging,
        uuid,
        execKey,
        outputs,
        this.environment,
        environmentManager
      )
        .catch((e) => {
          window.showErrorMessage(`Internal failure executing runner: ${e.message}`)
          log.error('Internal failure executing runner', e.message)
          return false
        })

      if (execKey === 'bash' || execKey === 'sh') {
        successfulCellExecution = await runScript(execKey)
      } else {
        successfulCellExecution = await executor[execKey].call(
          this, exec, runningCell, outputs, runScript, environmentManager
        )
      }
    } else {
      /**
       * check if user is running experiment to execute shell via runme cli
       */
      successfulCellExecution = await executor[execKey].call(this, exec, runningCell, outputs)
    }
    TelemetryReporter.sendTelemetryEvent('cell.endExecute', { 'cell.success': successfulCellExecution?.toString() })
    runmeExec.end(successfulCellExecution)
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
          log.error('Failed to create gRPC Runner environment', e)
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
