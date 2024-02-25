import {
  Disposable,
  workspace,
  notebooks,
  commands,
  ExtensionContext,
  tasks,
  window,
  Uri,
} from 'vscode'
import { TelemetryReporter } from 'vscode-telemetry'
import Channel from 'tangle/webviews'

import { Serializer, SyncSchema } from '../types'
import {
  getForceNewWindowConfig,
  getSessionOutputs,
  isPlatformAuthEnabled,
  registerExtensionEnvironmentVariables,
} from '../utils/configuration'
import { WebViews } from '../constants'

import { Kernel } from './kernel'
import RunmeServer from './server/runmeServer'
import RunmeServerError from './server/runmeServerError'
import {
  ToggleTerminalProvider,
  BackgroundTaskProvider,
  StopBackgroundTaskProvider,
} from './provider/background'
import { CopyProvider } from './provider/copy'
import {
  getDefaultWorkspace,
  bootFile,
  resetNotebookAutosaveSettings,
  getPlatformAuthSession,
} from './utils'
import { AnnotationsProvider } from './provider/annotations'
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
} from './commands'
import { WasmSerializer, GrpcSerializer } from './serializer'
import { RunmeLauncherProvider } from './provider/launcher'
import { RunmeUriHandler } from './handler/uri'
import GrpcRunner, { IRunner } from './runner'
import { CliProvider } from './provider/cli'
import * as survey from './survey'
import { RunmeCodeLensProvider } from './provider/codelens'
import CloudPanel from './panels/cloud'
import { createDemoFileRunnerForActiveNotebook, createDemoFileRunnerWatcher } from './handler/utils'
import { CloudAuthProvider } from './provider/cloudAuth'
import { StatefulAuthProvider } from './provider/statefulAuth'
import { NamedProvider } from './provider/named'
import { IPanel } from './panels/base'
import { NotebookPanel as EnvStorePanel } from './panels/notebook'

export class RunmeExtension {
  async initialize(context: ExtensionContext) {
    const kernel = new Kernel(context)
    const grpcSerializer = kernel.hasExperimentEnabled('grpcSerializer')
    const grpcServer = kernel.hasExperimentEnabled('grpcServer')
    const grpcRunner = kernel.hasExperimentEnabled('grpcRunner')
    const server = new RunmeServer(
      context.extensionUri,
      {
        retryOnFailure: true,
        maxNumberOfIntents: 10,
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

    const serializer = grpcSerializer
      ? new GrpcSerializer(context, server, kernel)
      : new WasmSerializer(context, kernel)

    const treeViewer = new RunmeLauncherProvider(getDefaultWorkspace())
    const runmeTaskProvider = tasks.registerTaskProvider(
      RunmeTaskProvider.id,
      new RunmeTaskProvider(context, treeViewer, serializer, kernel, server, runner),
    )

    /**
     * Start the Runme server
     */
    try {
      await server.launch()
    } catch (e) {
      // Unrecoverable error happened
      if (e instanceof RunmeServerError) {
        TelemetryReporter.sendTelemetryErrorEvent('extension.server', { data: e.message })
        if (server.transportType === RunmeServer.transportTypeDefault) {
          return window
            .showErrorMessage(
              `Failed to start Runme server (reason: ${e.message}).` +
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
          .showErrorMessage(`Failed to start Runme server. Reason: ${e.message}`)
          .then((action) => {
            if (!action) {
              return
            }
          })
      }
      TelemetryReporter.sendTelemetryErrorEvent('extension.server', { data: (e as Error).message })
      return window.showErrorMessage(
        'Failed to start Runme server, please try to reload the window. ' +
          `Reason: ${(e as any).message}`,
      )
    }

    const uriHandler = new RunmeUriHandler(context, kernel, getForceNewWindowConfig())
    const winCodeLensRunSurvey = new survey.SurveyWinCodeLensRun(context)
    const surveys: Disposable[] = [
      winCodeLensRunSurvey,
      new survey.SurveyActiveUserFeedback(context),
      new survey.SurveyFeedbackButton(context),
      new survey.SurveyNotifyV2(context),
    ]
    const stopBackgroundTaskProvider = new StopBackgroundTaskProvider()

    const runCLI = runCLICommand(context.extensionUri, !!grpcRunner, server, kernel)

    const codeLensProvider = new RunmeCodeLensProvider(
      context.extensionUri,
      serializer,
      runCLI,
      winCodeLensRunSurvey,
      runner,
      kernel,
      server,
    )

    registerExtensionEnvironmentVariables(context)
    await resetNotebookAutosaveSettings()

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
      notebooks.registerNotebookCellStatusBarItemProvider(Kernel.type, new CopyProvider()),
      notebooks.registerNotebookCellStatusBarItemProvider(Kernel.type, stopBackgroundTaskProvider),
      notebooks.registerNotebookCellStatusBarItemProvider(
        Kernel.type,
        new AnnotationsProvider(kernel),
      ),
      notebooks.registerNotebookCellStatusBarItemProvider(Kernel.type, new NamedProvider()),

      stopBackgroundTaskProvider,

      codeLensProvider,

      RunmeExtension.registerCommand('runme.resetRunnerSession', () => askNewRunnerSession(kernel)),
      RunmeExtension.registerCommand('runme.openIntegratedTerminal', openIntegratedTerminal),
      RunmeExtension.registerCommand('runme.toggleTerminal', toggleTerminal(kernel, !!grpcRunner)),
      RunmeExtension.registerCommand('runme.runCliCommand', runCLI),
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
      runmeTaskProvider,
      notebooks.registerNotebookCellStatusBarItemProvider(Kernel.type, new CliProvider()),

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
      RunmeExtension.registerCommand('runme.notebookAutoSaveOn', () => toggleAutosave(false)),
      RunmeExtension.registerCommand('runme.notebookAutoSaveOff', () => toggleAutosave(true)),
      RunmeExtension.registerCommand(
        'runme.notebookSessionOutputs',
        (e: { notebookEditor: { notebookUri: Uri }; ui: boolean }) => {
          const runnerEnv = kernel.getRunnerEnvironment()
          const sessionId = runnerEnv?.getSessionId()
          if (!e.ui || !sessionId) {
            return
          }
          const { notebookUri } = e.notebookEditor
          const outputFilePath = GrpcSerializer.getOutputsUri(notebookUri, sessionId)
          commands.executeCommand('markdown.showPreviewToSide', outputFilePath)
        },
      ),
    )

    if (isPlatformAuthEnabled()) {
      context.subscriptions.push(new StatefulAuthProvider(context, uriHandler))
      // Required to populate the Accounts Menu in the Activity Bar
      getPlatformAuthSession(false)
    } else {
      context.subscriptions.push(new CloudAuthProvider(context))
    }

    await bootFile(context)
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
      ...notebookPanelIds.map(register(notebookChannel, (id) => new EnvStorePanel(context, id))),
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
}
