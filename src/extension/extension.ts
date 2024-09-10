import {
  Disposable,
  workspace,
  notebooks,
  commands,
  ExtensionContext,
  tasks,
  window,
  env,
  Uri,
  NotebookCell,
  authentication,
} from 'vscode'
import { TelemetryReporter } from 'vscode-telemetry'
import Channel from 'tangle/webviews'

import { NotebookUiEvent, Serializer, SyncSchema } from '../types'
import {
  getDocsUrlFor,
  getForceNewWindowConfig,
  getRunmeAppUrl,
  getSessionOutputs,
} from '../utils/configuration'
import { AuthenticationProviders, WebViews } from '../constants'

import { Kernel } from './kernel'
import KernelServer from './server/kernelServer'
import KernelServerError from './server/kernelServerError'
import {
  ToggleTerminalProvider,
  BackgroundTaskProvider,
  StopBackgroundTaskProvider,
} from './provider/background'
import {
  getDefaultWorkspace,
  bootFile,
  resetNotebookSettings,
  getPlatformAuthSession,
  getGithubAuthSession,
  openFileAsRunmeNotebook,
} from './utils'
import { RunmeTaskProvider } from './provider/runmeTask'
import {
  toggleTerminal,
  runCLICommand,
  copyCellToClipboard,
  openAsRunmeNotebook,
  openSplitViewAsMarkdownText,
  stopBackgroundTask,
  createNewRunmeNotebook,
  welcome,
  tryIt,
  openFileInRunme,
  openIntegratedTerminal,
  authenticateWithGitHub,
  displayCategoriesSelector,
  runCellsByCategory,
  addToRecommendedExtensions,
  openRunmeSettings,
  toggleAutosave,
  askNewRunnerSession,
  runCellWithPrompts,
  toggleMasking,
  createGistCommand,
  toggleAuthorMode,
  createCellGistCommand,
  runForkCommand,
} from './commands'
import { WasmSerializer, GrpcSerializer, SerializerBase } from './serializer'
import { RunmeLauncherProvider } from './provider/launcher'
import { RunmeUriHandler } from './handler/uri'
import GrpcRunner, { IRunner } from './runner'
import * as survey from './survey'
import { RunmeCodeLensProvider } from './provider/codelens'
import CloudPanel from './panels/cloud'
import { createDemoFileRunnerForActiveNotebook, createDemoFileRunnerWatcher } from './handler/utils'
import { GithubAuthProvider } from './provider/githubAuth'
import { StatefulAuthProvider } from './provider/statefulAuth'
import { IPanel } from './panels/base'
import { NotebookPanel as EnvStorePanel } from './panels/notebook'
import { NotebookCellStatusBarProvider } from './provider/cellStatusBar/notebook'
import { SessionOutputCellStatusBarProvider } from './provider/cellStatusBar/sessionOutput'
import { GrpcReporter } from './reporter'
import * as manager from './ai/manager'
import getLogger from './logger'

export class RunmeExtension {
  protected serializer?: SerializerBase

  async initialize(context: ExtensionContext) {
    const kernel = new Kernel(context)
    const grpcSerializer = kernel.hasExperimentEnabled('grpcSerializer')
    const grpcServer = kernel.hasExperimentEnabled('grpcServer')
    const grpcRunner = kernel.hasExperimentEnabled('grpcRunner')
    const aiLogs = kernel.hasExperimentEnabled('aiLogs')

    const server = new KernelServer(
      context.extensionUri,
      {
        retryOnFailure: true,
        maxNumberOfIntents: 10,
        aiLogs: aiLogs,
      },
      !grpcServer,
      grpcRunner,
    )

    let runner: IRunner | undefined
    if (grpcRunner) {
      runner = new GrpcRunner(server)
      kernel.useRunner(runner)
    }

    // register ahead of attempting to server launch for error handling
    context.subscriptions.push(
      RunmeExtension.registerCommand('runme.openSettings', openRunmeSettings),
    )

    const reporter = new GrpcReporter(context, server)
    const serializer = grpcSerializer
      ? new GrpcSerializer(context, server, kernel)
      : new WasmSerializer(context, kernel)
    this.serializer = serializer
    kernel.setSerializer(serializer as GrpcSerializer)
    kernel.setReporter(reporter)

    const treeViewer = new RunmeLauncherProvider(getDefaultWorkspace())
    const runmeTaskProvider = tasks.registerTaskProvider(
      RunmeTaskProvider.id,
      new RunmeTaskProvider(context, treeViewer, serializer, kernel, server, runner),
    )

    /**
     * Start the Kernel server
     */
    try {
      await server.launch()
    } catch (e) {
      // Unrecoverable error happened
      if (e instanceof KernelServerError) {
        TelemetryReporter.sendTelemetryErrorEvent('extension.server', { data: e.message })
        if (server.transportType === KernelServer.transportTypeDefault) {
          return window
            .showErrorMessage(
              `Failed to start Kernel server (reason: ${e.message}).` +
                ' Consider switching from TCP to Unix Domain Socket in Settings.',
              'Open Settings',
            )
            .then((action) => {
              if (!action) {
                return
              }
              return commands.executeCommand('runme.openSettings', 'runme.server.transportType')
            })
        }
        return window
          .showErrorMessage(`Failed to start Kernel server. Reason: ${e.message}`)
          .then((action) => {
            if (!action) {
              return
            }
          })
      }
      TelemetryReporter.sendTelemetryErrorEvent('extension.server', { data: (e as Error).message })
      return window.showErrorMessage(
        'Failed to start Kernel server, please try to reload the window. ' +
          `Reason: ${(e as any).message}`,
      )
    }

    // Start the AIManager. This will enable the AI services if the user has enabled them.
    const aiManager = new manager.AIManager()
    // We need to hang onto a reference to the AIManager so it doesn't get garbage collected until the
    // extension is deactivated.
    context.subscriptions.push(aiManager)

    const uriHandler = new RunmeUriHandler(context, kernel, getForceNewWindowConfig())
    const winCodeLensRunSurvey = new survey.SurveyWinCodeLensRun(context)
    const surveys: Disposable[] = [
      winCodeLensRunSurvey,
      new survey.SurveyActiveUserFeedback(context),
      new survey.SurveyFeedbackButton(context),
      new survey.SurveyNotifyV2(context),
    ]
    const stopBackgroundTaskProvider = new StopBackgroundTaskProvider()

    const runCLI = runCLICommand(kernel, context.extensionUri, !!grpcRunner)
    const runFork = runForkCommand(kernel, context.extensionUri, !!grpcRunner)

    const codeLensProvider = new RunmeCodeLensProvider(
      context.extensionUri,
      serializer,
      runCLI,
      winCodeLensRunSurvey,
      runner,
      kernel,
      server,
    )

    await resetNotebookSettings()

    const transientOutputs = !getSessionOutputs()

    const omitKeys: Serializer.Metadata = {
      ['runme.dev/name']: undefined,
      ['runme.dev/nameGenerated']: undefined,
      ['runme.dev/id']: undefined,
      ['runme.dev/textRange']: undefined,
    }
    const transientCellMetadata = Object.fromEntries(Object.keys(omitKeys).map((k) => [k, true]))

    context.subscriptions.push(
      kernel,
      serializer,
      server,
      treeViewer,
      ...this.registerPanels(kernel, context),
      ...surveys,
      workspace.registerNotebookSerializer(Kernel.type, serializer, {
        transientCellMetadata,
        transientOutputs,
      }),

      notebooks.registerNotebookCellStatusBarItemProvider(
        Kernel.type,
        new ToggleTerminalProvider(kernel),
      ),
      notebooks.registerNotebookCellStatusBarItemProvider(
        Kernel.type,
        new BackgroundTaskProvider(),
      ),
      notebooks.registerNotebookCellStatusBarItemProvider(Kernel.type, stopBackgroundTaskProvider),
      notebooks.registerNotebookCellStatusBarItemProvider(
        Kernel.type,
        new NotebookCellStatusBarProvider(kernel),
      ),
      notebooks.registerNotebookCellStatusBarItemProvider(
        Kernel.type,
        new SessionOutputCellStatusBarProvider(kernel),
      ),
      stopBackgroundTaskProvider,

      codeLensProvider,

      RunmeExtension.registerCommand('runme.resetRunnerSession', () => askNewRunnerSession(kernel)),
      RunmeExtension.registerCommand('runme.openIntegratedTerminal', openIntegratedTerminal),
      RunmeExtension.registerCommand('runme.toggleTerminal', toggleTerminal(kernel, !!grpcRunner)),
      RunmeExtension.registerCommand('runme.runCliCommand', runCLI),
      RunmeExtension.registerCommand('runme.runForkCommand', runFork),
      RunmeExtension.registerCommand('runme.copyCellToClipboard', copyCellToClipboard),
      RunmeExtension.registerCommand('runme.stopBackgroundTask', stopBackgroundTask),
      RunmeExtension.registerCommand(
        'runme.openSplitViewAsMarkdownText',
        openSplitViewAsMarkdownText,
      ),
      RunmeExtension.registerCommand('runme.openAsRunmeNotebook', openAsRunmeNotebook),
      RunmeExtension.registerCommand('runme.runCategory', (notebook) => {
        return displayCategoriesSelector({ context, kernel, notebookToolbarCommand: notebook })
      }),
      RunmeExtension.registerCommand('runme.runCellCategory', (cell) =>
        runCellsByCategory(cell, kernel),
      ),
      RunmeExtension.registerCommand('runme.new', createNewRunmeNotebook),
      RunmeExtension.registerCommand('runme.welcome', welcome),
      RunmeExtension.registerCommand('runme.try', () => tryIt(context)),
      RunmeExtension.registerCommand('runme.openRunmeFile', RunmeLauncherProvider.openFile),
      RunmeExtension.registerCommand('runme.keybinding.noop', () => {}),
      RunmeExtension.registerCommand('runme.file.openInRunme', openFileInRunme),
      RunmeExtension.registerCommand('runme.runWithPrompts', (cell) =>
        runCellWithPrompts(cell, kernel),
      ),
      runmeTaskProvider,

      /**
       * tree viewer items
       */
      window.registerTreeDataProvider('runme.launcher', treeViewer),
      RunmeExtension.registerCommand(
        'runme.collapseTreeView',
        treeViewer.collapseAll.bind(treeViewer),
      ),
      RunmeExtension.registerCommand('runme.expandTreeView', treeViewer.expandAll.bind(treeViewer)),
      RunmeExtension.registerCommand(
        'runme.tasksIncludeUnnamed',
        treeViewer.includeUnnamed.bind(treeViewer),
      ),
      RunmeExtension.registerCommand(
        'runme.tasksExcludeUnnamed',
        treeViewer.excludeUnnamed.bind(treeViewer),
      ),
      RunmeExtension.registerCommand('runme.authenticateWithGitHub', authenticateWithGitHub),
      /**
       * Uri handler
       */
      window.registerUriHandler(uriHandler),

      /**
       * Runme Message Display commands
       */
      RunmeExtension.registerCommand('runme.addToRecommendedExtensions', () =>
        addToRecommendedExtensions(context),
      ),
      createDemoFileRunnerForActiveNotebook(context, kernel),
      createDemoFileRunnerWatcher(context, kernel),
      RunmeExtension.registerCommand(
        'runme.notebookOutputsMasked',
        this.handleMasking(kernel, true).bind(this),
      ),
      RunmeExtension.registerCommand(
        'runme.notebookOutputsUnmasked',
        this.handleMasking(kernel, false).bind(this),
      ),
      RunmeExtension.registerCommand('runme.notebookGistShare', (event: NotebookUiEvent) =>
        createGistCommand(event, context),
      ),
      RunmeExtension.registerCommand('runme.cellGistShare', (cell: NotebookCell) =>
        createCellGistCommand(cell, context),
      ),
      RunmeExtension.registerCommand('runme.notebookAutoSaveOn', () => toggleAutosave(false)),
      RunmeExtension.registerCommand('runme.notebookAutoSaveOff', () => toggleAutosave(true)),
      RunmeExtension.registerCommand('runme.notebookAuthorMode', () =>
        toggleAuthorMode(false, kernel),
      ),
      RunmeExtension.registerCommand('runme.notebookExplorerMode', () =>
        toggleAuthorMode(true, kernel),
      ),
      RunmeExtension.registerCommand('runme.notebookSessionOutputs', (e: NotebookUiEvent) => {
        const runnerEnv = kernel.getRunnerEnvironment()
        const sessionId = runnerEnv?.getSessionId()
        if (!e.ui || !sessionId) {
          return
        }
        const { notebookUri } = e.notebookEditor
        const outputFilePath = GrpcSerializer.getOutputsUri(notebookUri, sessionId)
        openFileAsRunmeNotebook(outputFilePath)
      }),

      // Register a command to generate completions using foyle
      RunmeExtension.registerCommand(
        'runme.aiGenerate',
        aiManager.completionGenerator.generateCompletion,
      ),
    )

    await bootFile(context)

    if (kernel.hasExperimentEnabled('shellWarning', false)) {
      const showUnsupportedShellMessage = async () => {
        const showMore = 'Show more'

        const answer = await window.showErrorMessage('Unsupported shell', showMore)
        if (answer === showMore) {
          const url = getDocsUrlFor('/r/extension/supported-shells')
          env.openExternal(Uri.parse(url))
        }
      }

      const logger = getLogger('runme.experiments.shellWarning')

      kernel
        .runProgram('echo $SHELL')
        .then((output) => {
          if (output === false) {
            return
          }

          const supportedShells = ['bash', 'zsh']
          const isSupported = supportedShells.some((sh) => output?.includes(sh))
          logger.info(`Shell: ${output}`)

          if (!isSupported) {
            showUnsupportedShellMessage()
          }
        })
        .catch((e) => {
          logger.error(e)
          showUnsupportedShellMessage()
        })
    }

    context.subscriptions.push(new StatefulAuthProvider(context, uriHandler))
    getPlatformAuthSession(kernel.isFeatureActive('ForceLogin')).then((session) => {
      if (session) {
        const openDashboardStr = 'Open Dashboard'
        window
          .showInformationMessage('Logged into the Stateful Platform', openDashboardStr)
          .then((answer) => {
            if (answer === openDashboardStr) {
              const dashboardUri = getRunmeAppUrl(['app'])
              const uri = Uri.parse(dashboardUri)
              env.openExternal(uri)
            }
          })
      }
    })

    context.subscriptions.push(new GithubAuthProvider(context))
    getGithubAuthSession(false).then((session) => {
      kernel.updateFeatureState('githubAuth', !!session)
    })

    authentication.onDidChangeSessions((e) => {
      if (e.provider.id === AuthenticationProviders.Stateful) {
        getPlatformAuthSession(false).then((session) => {
          kernel.updateFeatureState('statefulAuth', !!session)
        })
      }
      if (e.provider.id === AuthenticationProviders.GitHub) {
        getGithubAuthSession(false).then((session) => {
          kernel.updateFeatureState('githubAuth', !!session)
        })
      }
    })
  }

  protected handleMasking(kernel: Kernel, maskingIsOn: boolean): (e: NotebookUiEvent) => void {
    const showSessionExpiryErrMessage = () => {
      return window.showErrorMessage(
        'Cannot toggle masking of outputs for expired sessions. Consider re-running the original notebook',
        { modal: true },
      )
    }

    return async (e: NotebookUiEvent) => {
      if (!e.ui) {
        return
      }
      const uri = e.notebookEditor.notebookUri
      const runnerEnv = kernel.getRunnerEnvironment()
      const sessionId = runnerEnv?.getSessionId()

      if (!sessionId || !uri.fsPath.includes(sessionId)) {
        await showSessionExpiryErrMessage()
        return
      }

      await toggleMasking(maskingIsOn)
      const written = (await this.serializer?.saveNotebookOutputs(uri)) ?? -1
      if (written > -1) {
        // success early return
        return
      }

      await toggleMasking(!maskingIsOn)
      await showSessionExpiryErrMessage()
    }
  }

  protected registerPanels(kernel: Kernel, context: ExtensionContext): Disposable[] {
    const register = (channel: Channel<SyncSchema>, factory: (pid: string) => IPanel) => {
      return (id: string): Disposable[] => {
        const p = factory(id)
        const bus$ = channel.register([p.webview])
        p.registerBus(bus$)
        const webviewProvider = window.registerWebviewViewProvider(id, p)
        kernel.registerWebview(id, p, webviewProvider)
        return [webviewProvider]
      }
    }

    const appChannel = new Channel<SyncSchema>('app')
    const runmePanelIds: string[] = [
      WebViews.RunmeCloud as const,
      WebViews.RunmeChat as const,
      WebViews.RunmeSearch as const,
    ]

    const notebookChannel = new Channel<SyncSchema>('notebooks')
    const notebookPanelIds: string[] = [WebViews.NotebookEnvStore as const]

    return [
      ...runmePanelIds.map(register(appChannel, (id) => new CloudPanel(context, id))),
      ...notebookPanelIds.map(
        register(notebookChannel, (id) => new EnvStorePanel(context, id, kernel.onVarsChangeEvent)),
      ),
    ].flat()
  }

  static registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any) {
    return commands.registerCommand(
      command,
      (...wrappedArgs: any[]) => {
        TelemetryReporter.sendTelemetryEvent('extension.command', { command })
        return callback(...wrappedArgs, thisArg)
      },
      thisArg,
    )
  }

  static getExtensionIdentifier(context: ExtensionContext) {
    const publisher = context.extension.packageJSON.publisher
    const name = context.extension.packageJSON.name
    return `${publisher}.${name}`
  }
}
