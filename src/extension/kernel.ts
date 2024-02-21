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
  languages,
  TextDocument,
  NotebookRange,
  NotebookEditorRevealType,
  NotebookEditorSelectionChangeEvent,
} from 'vscode'
import { TelemetryReporter } from 'vscode-telemetry'

import type { ActiveTerminal, ClientMessage, RunmeTerminal, Serializer } from '../types'
import {
  ClientMessages,
  DEFAULT_LANGUAGEID,
  NOTEBOOK_HAS_CATEGORIES,
  SUPPORTED_FILE_EXTENSIONS,
  CATEGORY_SEPARATOR,
} from '../constants'
import { API } from '../utils/deno/api'
import { postClientMessage } from '../utils/messaging'
import { getNotebookExecutionOrder, isPlatformAuthEnabled } from '../utils/configuration'

import * as survey from './survey'
import getLogger from './logger'
import executor, { type IEnvironmentManager, ENV_STORE_MANAGER, IKernelExecutor } from './executors'
import { DENO_ACCESS_TOKEN_KEY } from './constants'
import {
  getKey,
  getAnnotations,
  hashDocumentUri,
  processEnviron,
  isWindows,
  setNotebookCategories,
  getTerminalRunmeId,
  suggestCategories,
  handleNotebookAutosaveSettings,
} from './utils'
import { isShellLanguage } from './executors/utils'
import './wasm/wasm_exec.js'
import { RpcError } from './grpc/client'
import { IRunner } from './runner'
import { IRunnerEnvironment } from './runner/environment'
import { executeRunner } from './executors/runner'
import { ITerminalState, NotebookTerminalType } from './terminal/terminalState'
import {
  NotebookCellManager,
  NotebookCellOutputManager,
  RunmeNotebookCellExecution,
  getCellById,
} from './cell'
import { handleCellOutputMessage } from './messages/cellOutput'
import handleGitHubMessage from './messages/github'
import { getNotebookCategories } from './utils'
import { handleCloudApiMessage } from './messages/cloudApiRequest'
import { SurveyShebangComingSoon } from './survey'
import PanelManager from './panels/panelManager'
import Panel from './panels/panel'
import { GrpcSerializer } from './serializer'
import { askAlternativeOutputsAction } from './commands'
import { handlePlatformApiMessage } from './messages/platformRequest'
import { handleClusterMessage } from './messages/gcp'

enum ConfirmationItems {
  Yes = 'Yes',
  No = 'No',
  Skip = 'Skip confirmation and run all',
  Cancel = 'Cancel',
}

const log = getLogger('Kernel')

export class Kernel implements Disposable {
  static readonly type = 'runme' as const

  readonly #experiments = new Map<string, boolean>()
  readonly #shebangComingSoon: SurveyShebangComingSoon

  #disposables: Disposable[] = []
  #controller = notebooks.createNotebookController(
    Kernel.type,
    Kernel.type,
    Kernel.type.toUpperCase(),
  )
  protected messaging = notebooks.createRendererMessaging('runme-renderer')

  protected runner?: IRunner
  protected runnerEnv?: IRunnerEnvironment
  protected runnerReadyListener?: Disposable

  protected cellManager: NotebookCellManager
  protected activeTerminals: ActiveTerminal[] = []
  protected category?: string
  protected panelManager: PanelManager

  constructor(protected context: ExtensionContext) {
    const config = workspace.getConfiguration('runme.experiments')
    this.#experiments.set('grpcSerializer', config.get<boolean>('grpcSerializer', true))
    this.#experiments.set('grpcRunner', config.get<boolean>('grpcRunner', true))
    this.#experiments.set('grpcServer', config.get<boolean>('grpcServer', true))
    this.#experiments.set('escalationButton', config.get<boolean>('escalationButton', false))

    this.#shebangComingSoon = new survey.SurveyShebangComingSoon(context)

    this.cellManager = new NotebookCellManager(this.#controller)
    this.#controller.supportsExecutionOrder = getNotebookExecutionOrder()
    this.#controller.description = 'Run your Markdown'
    this.#controller.executeHandler = this._executeAll.bind(this)

    languages.getLanguages().then((l) => {
      this.#controller.supportedLanguages = [
        // TODO(mxs): smartly select default language depending on user shell
        //            e.g., use powershell/bat for respective shells
        DEFAULT_LANGUAGEID,
        ...l.filter((x) => x !== DEFAULT_LANGUAGEID),

        // need to include file extensions since people often use file
        // extension to tag code blocks
        // TODO(mxs): should allow users to select their own
        ...SUPPORTED_FILE_EXTENSIONS,
      ]
    })

    this.messaging.postMessage({ from: 'kernel' })
    this.panelManager = new PanelManager(context)
    this.#disposables.push(
      this.#shebangComingSoon,
      this.messaging.onDidReceiveMessage(this.#handleRendererMessage.bind(this)),
      workspace.onDidOpenNotebookDocument(this.#handleOpenNotebook.bind(this)),
      workspace.onDidSaveNotebookDocument(this.#handleSaveNotebook.bind(this)),
      window.onDidChangeActiveColorTheme(this.#handleActiveColorThemeMessage.bind(this)),
      window.onDidChangeActiveNotebookEditor(this.#handleActiveNotebook.bind(this)),
      this.panelManager,
    )
  }

  registerNotebookCell(cell: NotebookCell) {
    this.cellManager.registerCell(cell)
  }
  setCategory(category: string) {
    this.category = category
  }

  hasExperimentEnabled(key: string, defaultValue?: boolean) {
    return this.#experiments.get(key) ?? defaultValue
  }

  dispose() {
    this.getEnvironmentManager()?.reset()
    this.#controller.dispose()
    this.#disposables.forEach((d) => d.dispose())
    this.runnerReadyListener?.dispose()
    this.activeTerminals = []
  }

  async getTerminalState(cell: NotebookCell): Promise<ITerminalState | undefined> {
    return (await this.getCellOutputs(cell)).getCellTerminalState()
  }

  async registerCellTerminalState(
    cell: NotebookCell,
    type: NotebookTerminalType,
  ): Promise<ITerminalState> {
    const outputs = await this.cellManager.getNotebookOutputs(cell)
    return outputs.registerCellTerminalState(type)
  }

  async #handleSaveNotebook({ uri, isUntitled, notebookType, getCells }: NotebookDocument) {
    if (notebookType !== Kernel.type) {
      return
    }
    const availableCategories = new Set<string>([
      ...getCells()
        .map((cell) => getAnnotations(cell).category.split(CATEGORY_SEPARATOR))
        .flat()
        .filter((c) => c.length > 0),
    ])
    await setNotebookCategories(this.context, uri, availableCategories)
    await commands.executeCommand('setContext', NOTEBOOK_HAS_CATEGORIES, !!availableCategories.size)
    const isReadme = uri.fsPath.toUpperCase().includes('README')
    const hashed = hashDocumentUri(uri.toString())

    TelemetryReporter.sendTelemetryEvent('notebook.save', {
      'notebook.hashedUri': hashed,
      'notebook.isReadme': isReadme.toString(),
      'notebook.isUntitled': isUntitled.toString(),
    })
  }

  async #handleOpenNotebook(notebookDocument: NotebookDocument) {
    const isSessionsOutput = await Kernel.denySessionOutputsNotebook(notebookDocument)
    const { uri, isUntitled, notebookType, getCells } = notebookDocument
    if (isSessionsOutput || notebookType !== Kernel.type) {
      return
    }
    getCells().forEach((cell) => this.registerNotebookCell(cell))
    const availableCategories = new Set<string>([
      ...getCells()
        .map((cell) => getAnnotations(cell).category.split(CATEGORY_SEPARATOR))
        .flat()
        .filter((c) => c.length > 0),
    ])

    await setNotebookCategories(this.context, uri, availableCategories)
    const isReadme = uri.fsPath.toUpperCase().includes('README')
    const hashed = hashDocumentUri(uri.toString())
    await handleNotebookAutosaveSettings()
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
    // Check if the message type is a cloud API request and platform authentication is enabled.
    if (message.type === ClientMessages.cloudApiRequest && isPlatformAuthEnabled()) {
      // Remap the message type to platform API request if platform authentication is enabled.
      message = { ...message, type: ClientMessages.platformApiRequest }
    }

    if (message.type === ClientMessages.mutateAnnotations) {
      const payload = message as ClientMessage<ClientMessages.mutateAnnotations>

      let editCell: NotebookCell | undefined = undefined
      for (const document of workspace.notebookDocuments) {
        for (const cell of document.getCells()) {
          if (
            cell.kind !== NotebookCellKind.Code ||
            cell.document.uri.fsPath !== editor.notebook.uri.fsPath
          ) {
            continue
          }

          if (cell.metadata?.['runme.dev/id'] === undefined) {
            log.error(`Cell with index ${cell.index} lacks id`)
            continue
          }

          if (cell.metadata?.['runme.dev/id'] === payload.output.annotations['runme.dev/id']) {
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
        const notebookEdit = NotebookEdit.updateCellMetadata(editCell.index, newMetadata)

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
        payload.output.productionDeployment,
      )
      postClientMessage(this.messaging, ClientMessages.denoUpdate, {
        promoted: deployed.valueOf(),
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
      return window.showInformationMessage(message.output as string)
    } else if (message.type === ClientMessages.errorMessage) {
      return window.showErrorMessage(message.output as string)
    } else if (message.type === ClientMessages.openLink) {
      return env.openExternal(Uri.parse(message.output))
    } else if (message.type === ClientMessages.closeCellOutput) {
      const cell = await getCellById({ editor, id: message.output.id })
      if (!cell) {
        return
      }
      return handleCellOutputMessage({
        message,
        cell,
        kernel: this,
        outputType: message.output.outputType,
      })
    } else if (message.type === ClientMessages.githubWorkflowDispatch) {
      await handleGitHubMessage({ messaging: this.messaging, message })
    } else if (message.type === ClientMessages.displayPrompt) {
      const cell = await getCellById({ editor, id: message.output.id })
      if (!cell || message.output.id !== cell.metadata?.['runme.dev/id']) {
        return
      }
      const categories = await getNotebookCategories(this.context, cell.document.uri)
      const { disposables, answer } = await suggestCategories(
        categories,
        message.output.title,
        message.output.placeholder,
      )
      this.#disposables.push(...disposables)
      postClientMessage(this.messaging, ClientMessages.onPrompt, {
        answer,
        id: message.output.id,
      })
    } else if (message.type === ClientMessages.getState) {
      const cell = await getCellById({ editor, id: message.output.id })
      if (!cell) {
        return
      }
      postClientMessage(this.messaging, ClientMessages.onGetState, {
        state: message.output.state,
        value: getAnnotations(cell).category.split(CATEGORY_SEPARATOR).filter(Boolean),
        id: message.output.id,
      })
    } else if (message.type === ClientMessages.setState) {
      const cell = await getCellById({ editor, id: message.output.id })
      if (!cell) {
        return
      }
      const categories = await getNotebookCategories(this.context, cell.notebook.uri)
      await setNotebookCategories(
        this.context,
        cell.notebook.uri,
        new Set([...message.output.value, ...categories].sort()),
      )
    } else if (message.type === ClientMessages.onCategoryChange) {
      const btnSave = 'Save Now'
      window.showWarningMessage('Save changes?', btnSave).then((val) => {
        if (val === btnSave) {
          commands.executeCommand('workbench.action.files.save')
        }
      })
    } else if (message.type === ClientMessages.platformApiRequest) {
      return handlePlatformApiMessage({
        messaging: this.messaging,
        message: { ...message, type: ClientMessages.platformApiRequest },
        editor,
        kernel: this,
      })
    } else if (message.type === ClientMessages.cloudApiRequest) {
      return handleCloudApiMessage({
        messaging: this.messaging,
        message,
        editor,
        kernel: this,
      })
    } else if (message.type === ClientMessages.optionsMessage) {
      if (message.output.telemetryEvent) {
        TelemetryReporter.sendTelemetryEvent(message.output.telemetryEvent)
      }
      const answer = await window.showInformationMessage(
        message.output.title,
        { modal: !!message.output.modal },
        ...message.output.options,
      )
      return postClientMessage(this.messaging, ClientMessages.onOptionsMessage, {
        option: answer,
        id: message.output.id,
      })
    } else if (message.type === ClientMessages.copyTextToClipboard) {
      await env.clipboard.writeText(message.output.text)
      return postClientMessage(this.messaging, ClientMessages.onCopyTextToClipboard, {
        id: message.output.id,
      })
    } else if (message.type === ClientMessages.openExternalLink) {
      TelemetryReporter.sendRawTelemetryEvent(message.output.telemetryEvent)
      return env.openExternal(Uri.parse(message.output.link))
    } else if (message.type === ClientMessages.tangleEvent) {
      const webviewPanel = this.panelManager.getPanel(message.output.webviewId)
      if (webviewPanel) {
        return webviewPanel.getBus()?.emit('onSave', {
          cellId: message.output.data.cellId,
        })
      }
    } else if (
      [
        ClientMessages.gcpClusterCheckStatus,
        ClientMessages.gcpClusterDetails,
        ClientMessages.gcpClusterDetailsNewCell,
      ].includes(message.type)
    ) {
      await handleClusterMessage({ messaging: this.messaging, message, editor })
    } else if (message.type.startsWith('terminal:')) {
      return
    }

    log.error(`Unknown kernel event type: ${message.type}`)
  }

  private async _executeAll(cells: NotebookCell[]) {
    await commands.executeCommand('setContext', NOTEBOOK_HAS_CATEGORIES, false)
    const totalNotebookCells =
      (cells[0] &&
        cells[0].notebook.getCells().filter((cell) => cell.kind === NotebookCellKind.Code)
          .length) ||
      0
    const totalCellsToExecute = cells.length
    let showConfirmPrompt = totalNotebookCells === totalCellsToExecute && totalNotebookCells > 1
    let cellsExecuted = 0

    for (const cell of cells) {
      const annotations = getAnnotations(cell)
      if (
        (totalCellsToExecute > 1 &&
          this.category &&
          !annotations.category.split(CATEGORY_SEPARATOR).includes(this.category)) ||
        annotations.excludeFromRunAll
      ) {
        continue
      }
      if (showConfirmPrompt) {
        const cellText = cell.document.getText()
        const cellLabel =
          annotations.name || cellText.length > 20 ? `${cellText.slice(0, 20)}...` : cellText

        const answer = (await window.showQuickPick(Object.values(ConfirmationItems), {
          title: `Are you sure you like to run "${cellLabel}"?`,
          ignoreFocusOut: true,
        })) as ConfirmationItems | undefined

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

  public async createCellExecution(
    cell: NotebookCell,
  ): Promise<RunmeNotebookCellExecution | undefined> {
    return await this.cellManager.createNotebookCellExecution(cell)
  }

  public async getCellOutputs(cell: NotebookCell): Promise<NotebookCellOutputManager> {
    return await this.cellManager.getNotebookOutputs(cell)
  }

  private async openAndWaitForTextDocument(uri: Uri): Promise<TextDocument | undefined> {
    let textDocument = await workspace.openTextDocument(uri)
    if (!textDocument) {
      textDocument = await new Promise((resolve) => {
        workspace.onDidOpenTextDocument((document: TextDocument) => {
          resolve(document)
        })
      })
    }
    return textDocument
  }

  private async _doExecuteCell(cell: NotebookCell): Promise<void> {
    const runningCell = await this.openAndWaitForTextDocument(cell.document.uri)
    if (!runningCell) {
      throw new Error(`Failed to open ${cell.document.uri}`)
    }
    const runmeExec = await this.createCellExecution(cell)

    if (!runmeExec) {
      log.warn('Unable to create execution')
      return
    }

    const exec = runmeExec.underlyingExecution

    const id = (cell.metadata as Serializer.Metadata)['runme.dev/id']

    if (!id) {
      throw new Error('Executable cell does not have ID field!')
    }

    TelemetryReporter.sendTelemetryEvent('cell.startExecute')
    runmeExec.start(Date.now())
    let execKey = getKey(runningCell)

    let successfulCellExecution: boolean

    const envMgr = this.getEnvironmentManager()
    const outputs = await this.getCellOutputs(cell)

    if (
      this.runner &&
      // hard disable gRPC runner on windows
      // TODO(mxs): support windows shells
      !isWindows()
    ) {
      const runScript = (key: string = execKey) =>
        executeRunner({
          kernel: this,
          doc: cell.document,
          context: this.context,
          runner: this.runner!,
          exec,
          runningCell,
          messaging: this.messaging,
          cellId: id,
          execKey: key,
          outputs,
          runnerEnv: this.runnerEnv,
          envMgr,
        }).catch((e) => {
          if (e instanceof RpcError) {
            if (e.message.includes('invalid LanguageId')) {
              // todo(sebastian): provide "Configure" button to trigger foldout
              window
                .showWarningMessage(
                  // eslint-disable-next-line max-len
                  'Not every language is automatically executable. ' +
                    'Click below to learn what language runtimes are auto-detected. ' +
                    'You can also set an "interpreter" in the "Configure" foldout to define how this cell executes.',
                  'See Auto-Detected Languages',
                )
                .then((link) => {
                  if (!link) {
                    return
                  }
                  TelemetryReporter.sendTelemetryEvent('survey.shebangAutoDetectRedirect', {})
                  commands.executeCommand(
                    'vscode.open',
                    Uri.parse('https://runme.dev/redirect/shebang-auto-detect'),
                  )
                })
              return false
            }

            if (e.message.includes('invalid ProgramName')) {
              window.showErrorMessage(
                // eslint-disable-next-line max-len
                'Unable to locate interpreter specified in shebang (aka #!). Please check the cell\'s "Configure" foldout.',
              )
              return false
            }
          }

          window.showErrorMessage(`Internal failure executing runner: ${e.message}`)
          log.error('Internal failure executing runner', e.message)
          return false
        })

      if (isShellLanguage(execKey) || !(execKey in executor)) {
        successfulCellExecution = await runScript(execKey)
      } else {
        const executorByKey: IKernelExecutor = executor[execKey as keyof typeof executor]
        successfulCellExecution = await executorByKey({
          context: this.context,
          kernel: this,
          doc: runningCell,
          exec,
          outputs,
          messaging: this.messaging,
          envMgr,
          runScript,
        })
      }
    } else if (execKey in executor) {
      /**
       * check if user is running experiment to execute shell via runme cli
       */
      const executorByKey: IKernelExecutor = executor[execKey as keyof typeof executor]
      successfulCellExecution = await executorByKey({
        context: this.context,
        kernel: this,
        doc: runningCell,
        exec,
        outputs,
        messaging: this.messaging,
        envMgr,
      })
    } else {
      window.showErrorMessage('Cell language is not executable')

      successfulCellExecution = false
    }
    const annotations = getAnnotations(cell)

    TelemetryReporter.sendTelemetryEvent('cell.endExecute', {
      'cell.success': successfulCellExecution?.toString(),
      'cell.mimeType': annotations.mimeType,
    })
    runmeExec.end(successfulCellExecution, Date.now())
  }

  useRunner(runner: IRunner) {
    this.runnerReadyListener?.dispose()

    if (this.hasExperimentEnabled('grpcRunner') && runner) {
      if (this.runner === runner) {
        return
      }

      this.runner = runner

      this.runnerReadyListener = runner.onReady(this.newRunnerEnvironment.bind(this))
    }
  }

  getRunnerEnvironment(): IRunnerEnvironment | undefined {
    return this.runnerEnv
  }

  async newRunnerEnvironment(): Promise<void> {
    if (!this.runner) {
      log.error('Skipping new runner environment request since runner is not initialized.')
      return
    }

    log.info('Requesting new runner environment.')

    try {
      this.runnerEnv?.dispose()
      this.runnerEnv = undefined

      const runnerEnv = await this.runner.createEnvironment(
        // copy env from process naively for now
        // later we might want a more sophisticated approach/to bring this server-side
        processEnviron(),
      )

      this.runnerEnv = runnerEnv

      this.cellManager.setRunnerEnv(runnerEnv)

      // runs this last to not overwrite previous outputs
      await commands.executeCommand('notebook.clearAllCellsOutputs')

      log.info('New runner environment assigned with session ID:', runnerEnv.getSessionId())
    } catch (e: any) {
      window.showErrorMessage(`Failed to create environment for gRPC Runner: ${e.message}`)
      log.error('Failed to create gRPC Runner environment', e)
    }
  }

  // TODO: use better abstraction as part of move away from executor model
  private getEnvironmentManager(): IEnvironmentManager {
    if (this.runner) {
      return {
        get: async (key) => {
          if (!this.runnerEnv) {
            return undefined
          }
          return (await this.runner?.getEnvironmentVariables(this.runnerEnv))?.[key]
        },
        set: async (key, val) => {
          if (!this.runnerEnv) {
            return undefined
          }
          await this.runner?.setEnvironmentVariables(this.runnerEnv, { [key]: val })
        },
        reset: async () => {
          await this.newRunnerEnvironment()
        },
      }
    } else {
      return ENV_STORE_MANAGER
    }
  }

  getSupportedLanguages() {
    return this.#controller.supportedLanguages
  }

  registerTerminal(terminal: RunmeTerminal, executionId: number, runmeId: string) {
    // Dispose previously attached terminal
    const activeTerminal = this.activeTerminals.find((t) => t.runmeId === runmeId)
    if (activeTerminal) {
      this.activeTerminals.splice(this.activeTerminals.indexOf(activeTerminal), 1)
    }
    const exists = this.activeTerminals.find((t) => t.executionId === executionId)
    if (!exists) {
      this.activeTerminals.push({ ...terminal, executionId, runmeId })
    }
  }

  getTerminal(runmeId: string) {
    return this.activeTerminals.find((t) => {
      return getTerminalRunmeId(t) === runmeId
    }) as RunmeTerminal | undefined
  }

  registerWebview(webviewId: string, panel: Panel, disposableWebViewProvider: Disposable): void {
    this.panelManager.addPanel(webviewId, panel, disposableWebViewProvider)
  }

  // Emulate a human perception delay
  async keyboardDelay() {
    return new Promise((cb) => setTimeout(cb, 100))
  }

  async executeAndFocusNotebookCell(cell: NotebookCell) {
    // if the notebook is already opened
    if (!window.activeNotebookEditor?.selection) {
      let disposable: Disposable
      const onChangeSelection = async (_e: NotebookEditorSelectionChangeEvent) => {
        disposable.dispose()
        await this.doExecuteAndFocusNotebookCell(cell)
      }

      disposable = window.onDidChangeNotebookEditorSelection(onChangeSelection)
      return
    }

    await this.doExecuteAndFocusNotebookCell(cell)
  }

  async doExecuteAndFocusNotebookCell(cell: NotebookCell) {
    await commands.executeCommand('notebook.focusTop')

    await Promise.allSettled(
      Array.from({ length: cell.index }, async (_v, index) => {
        window.activeNotebookEditor?.revealRange(
          new NotebookRange(index, index),
          NotebookEditorRevealType.InCenter,
        )
        return commands.executeCommand('notebook.focusNextEditor')
      }),
    )

    await commands.executeCommand('notebook.cell.execute')
    await commands.executeCommand('notebook.cell.focusInOutput')
  }

  private static async denySessionOutputsNotebook(notebookDoc: NotebookDocument): Promise<boolean> {
    if (!GrpcSerializer.isDocumentSessionOutputs(notebookDoc.metadata)) {
      return false
    }

    await askAlternativeOutputsAction(notebookDoc)

    return true
  }
}
