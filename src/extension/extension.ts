
import { workspace, notebooks, commands, ExtensionContext, tasks, window, Uri } from 'vscode'
import { TelemetryReporter } from 'vscode-telemetry'

import { Kernel } from './kernel'
import RunmeServer from './server/runmeServer'
import RunmeServerError from './server/runmeServerError'
import { ShowTerminalProvider, BackgroundTaskProvider, StopBackgroundTaskProvider } from './provider/background'
import { CopyProvider } from './provider/copy'
import { getDefaultWorkspace, resetEnv } from './utils'
import { AnnotationsProvider } from './provider/annotations'
import { RunmeTaskProvider } from './provider/runmeTask'
import {
  openTerminal,
  runCLICommand,
  copyCellToClipboard,
  openAsRunmeNotebook,
  openSplitViewAsMarkdownText,
  stopBackgroundTask,
  createNewRunmeNotebook
} from './commands'
import { WasmSerializer, GrpcSerializer } from './serializer'
import { RunmeLauncherProvider } from './provider/launcher'
import { RunmeUriHandler } from './handler/uri'
import { BOOTFILE } from './constants'
import { GrpcRunner, IRunner } from './runner'
import { CliProvider } from './provider/cli'

export class RunmeExtension {
  async initialize(context: ExtensionContext) {
    const kernel = new Kernel(context)
    const grpcSerializer = kernel.hasExperimentEnabled('grpcSerializer')
    const grpcServer = kernel.hasExperimentEnabled('grpcServer')
    const grpcRunner = kernel.hasExperimentEnabled('grpcRunner')
    const server = new RunmeServer(context.extensionUri, {
      retryOnFailure: true,
      maxNumberOfIntents: 10,
    }, !grpcServer, grpcRunner)

    let runner: IRunner|undefined
    if (grpcRunner) {
      runner = new GrpcRunner(server)
      kernel.useRunner(runner)
    }

    const serializer = grpcSerializer ? new GrpcSerializer(context, server) : new WasmSerializer(context)

    /**
     * Start the Runme server
     */
    try {
      await server.launch()
    } catch (e) {
      // Unrecoverable error happened
      if (e instanceof RunmeServerError) {
        TelemetryReporter.sendTelemetryErrorEvent('extension.server', { data: e.message })
        return window.showErrorMessage(`Failed to start Runme server. Reason: ${e.message}`)
      }
      TelemetryReporter.sendTelemetryErrorEvent('extension.server', { data: (e as Error).message })
      return window.showErrorMessage('Failed to start Runme server, please try to reload the window')
    }

    const treeViewer = new RunmeLauncherProvider(getDefaultWorkspace())
    const uriHandler = new RunmeUriHandler(context)

    context.subscriptions.push(
      kernel,
      serializer,
      server,
      treeViewer,
      workspace.registerNotebookSerializer(Kernel.type, serializer, {
        transientOutputs: true,
        transientCellMetadata: {
          inputCollapsed: true,
          outputCollapsed: true,
        },
      }),

      notebooks.registerNotebookCellStatusBarItemProvider(Kernel.type, new ShowTerminalProvider()),
      notebooks.registerNotebookCellStatusBarItemProvider(Kernel.type, new BackgroundTaskProvider()),
      notebooks.registerNotebookCellStatusBarItemProvider(Kernel.type, new CopyProvider()),
      notebooks.registerNotebookCellStatusBarItemProvider(Kernel.type, new StopBackgroundTaskProvider()),
      notebooks.registerNotebookCellStatusBarItemProvider(Kernel.type, new AnnotationsProvider(kernel)),
      // notebooks.registerNotebookCellStatusBarItemProvider(Kernel.type, new TerminalViewProvider(kernel)),

      commands.registerCommand('runme.resetEnv', resetEnv),
      RunmeExtension.registerCommand('runme.openTerminal', openTerminal(kernel, !!grpcRunner)),
      RunmeExtension.registerCommand(
        'runme.runCliCommand',
        runCLICommand(context.extensionUri, !!grpcRunner, server, kernel)
      ),
      RunmeExtension.registerCommand('runme.copyCellToClipboard', copyCellToClipboard),
      RunmeExtension.registerCommand('runme.stopBackgroundTask', stopBackgroundTask),
      RunmeExtension.registerCommand('runme.openSplitViewAsMarkdownText', openSplitViewAsMarkdownText),
      RunmeExtension.registerCommand('runme.openAsRunmeNotebook', openAsRunmeNotebook),
      RunmeExtension.registerCommand('runme.new', createNewRunmeNotebook),
      RunmeExtension.registerCommand('runme.openRunmeFile', RunmeLauncherProvider.openFile),
      RunmeExtension.registerCommand('runme.keybinding.m', () => { }),
      RunmeExtension.registerCommand('runme.keybinding.y', () => { }),
      tasks.registerTaskProvider(RunmeTaskProvider.id, new RunmeTaskProvider(context, serializer, runner, kernel)),
      notebooks.registerNotebookCellStatusBarItemProvider(Kernel.type, new CliProvider()),

      /**
       * tree viewer items
       */
      window.registerTreeDataProvider('runme.launcher', treeViewer),
      RunmeExtension.registerCommand('runme.collapseTreeView', treeViewer.collapseAll.bind(treeViewer)),
      RunmeExtension.registerCommand('runme.expandTreeView', treeViewer.expandAll.bind(treeViewer)),

      /**
       * Uri handler
       */
      window.registerUriHandler(uriHandler)
    )

    if (workspace.workspaceFolders?.length && workspace.workspaceFolders[0]) {
      const startupFileUri = Uri.joinPath(workspace.workspaceFolders[0].uri, BOOTFILE)
      const hasStartupFile = await workspace.fs.stat(startupFileUri).then(() => true, () => false)
      if (hasStartupFile) {
        const bootFile = new TextDecoder().decode(await workspace.fs.readFile(startupFileUri))
        const bootFileUri = Uri.joinPath(workspace.workspaceFolders[0].uri, bootFile)
        await workspace.fs.delete(startupFileUri)
        await commands.executeCommand('vscode.open', bootFileUri)
      }
    }
  }

  static registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any) {
    return commands.registerCommand(command, (...wrappedArgs: any[]) => {
      TelemetryReporter.sendTelemetryEvent('extension.command', { command })
      return callback(...wrappedArgs, thisArg)
    }, thisArg)
  }
}
