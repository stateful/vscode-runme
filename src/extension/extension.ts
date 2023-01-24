
import { workspace, notebooks, commands, ExtensionContext, tasks, window } from 'vscode'
import { TelemetryReporter } from 'vscode-telemetry'

import { Kernel } from './kernel'
import { ShowTerminalProvider, BackgroundTaskProvider, StopBackgroundTaskProvider} from './provider/background'
import { CopyProvider } from './provider/copy'
import { getDefaultWorkspace, resetEnv } from './utils'
import { CliProvider } from './provider/cli'
import { AnnotationsProvider } from './provider/annotations'
import { RunmeTaskProvider } from './provider/runmeTask'
import {
  openTerminal,
  runCLICommand,
  copyCellToClipboard,
  openAsRunmeNotebook,
  openSplitViewAsMarkdownText ,
  stopBackgroundTask,
  createNewRunmeNotebook
} from './commands'
import { Serializer } from './serializer'
import { RunmeLauncherProvider } from './provider/launcher'


export class RunmeExtension {
  async initialize(context: ExtensionContext) {
    const kernel = new Kernel(context)
    const serializer = new Serializer(context)
    context.subscriptions.push(
      kernel,
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

      commands.registerCommand('runme.resetEnv', resetEnv),
      RunmeExtension.registerCommand('runme.openTerminal', openTerminal),
      RunmeExtension.registerCommand('runme.runCliCommand', runCLICommand),
      RunmeExtension.registerCommand('runme.copyCellToClipboard', copyCellToClipboard),
      RunmeExtension.registerCommand('runme.stopBackgroundTask', stopBackgroundTask),
      RunmeExtension.registerCommand('runme.openSplitViewAsMarkdownText', openSplitViewAsMarkdownText),
      RunmeExtension.registerCommand('runme.openAsRunmeNotebook', openAsRunmeNotebook),
      RunmeExtension.registerCommand('runme.new', createNewRunmeNotebook),
      RunmeExtension.registerCommand('runme.openRunmeFile', RunmeLauncherProvider.openFile),
      tasks.registerTaskProvider(RunmeTaskProvider.id, new RunmeTaskProvider(context)),
      window.registerTreeDataProvider('runme.launcher', new RunmeLauncherProvider(getDefaultWorkspace()))
    )

    /**
     * setup extension based on `pseudoterminal` experiment flag
     */
    const config = workspace.getConfiguration('runme.experiments')
    const hasPsuedoTerminalExperimentEnabled = config.get<boolean>('pseudoterminal')
    !hasPsuedoTerminalExperimentEnabled
      ? context.subscriptions.push(notebooks.registerNotebookCellStatusBarItemProvider(Kernel.type, new CliProvider()))
      : tasks.registerTaskProvider(RunmeTaskProvider.id, new RunmeTaskProvider(context))
  }

  static registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any) {
    return commands.registerCommand(command, (...wrappedArgs: any[]) => {
      TelemetryReporter.sendTelemetryEvent('extension.command', { command })
      return callback(...wrappedArgs, thisArg)
    }, thisArg)
  }
}
