
import { workspace, notebooks, commands, ExtensionContext, tasks, window } from 'vscode'

import { Kernel } from './kernel'
import { ShowTerminalProvider, BackgroundTaskProvider, StopBackgroundTaskProvider} from './provider/background'
import { CopyProvider } from './provider/copy'
import { resetEnv } from './utils'
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
      workspace.registerNotebookSerializer('runme', serializer, {
        transientOutputs: true,
        transientCellMetadata: {
          inputCollapsed: true,
          outputCollapsed: true,
        },
      }),

      notebooks.registerNotebookCellStatusBarItemProvider('runme', new ShowTerminalProvider()),
      notebooks.registerNotebookCellStatusBarItemProvider('runme', new BackgroundTaskProvider()),
      notebooks.registerNotebookCellStatusBarItemProvider('runme', new CopyProvider()),
      notebooks.registerNotebookCellStatusBarItemProvider('runme', new StopBackgroundTaskProvider()),
      notebooks.registerNotebookCellStatusBarItemProvider('runme', new AnnotationsProvider(kernel)),

      commands.registerCommand('runme.resetEnv', resetEnv),
      commands.registerCommand('runme.openTerminal', openTerminal),
      commands.registerCommand('runme.runCliCommand', runCLICommand),
      commands.registerCommand('runme.copyCellToClipboard', copyCellToClipboard),
      commands.registerCommand('runme.stopBackgroundTask', stopBackgroundTask),
      commands.registerCommand('runme.openSplitViewAsMarkdownText', openSplitViewAsMarkdownText),
      commands.registerCommand('runme.openAsRunmeNotebook', openAsRunmeNotebook),
      commands.registerCommand('runme.new', createNewRunmeNotebook),
      commands.registerCommand('runme.openRunmeFile', RunmeLauncherProvider.openFile),
      tasks.registerTaskProvider(RunmeTaskProvider.id, new RunmeTaskProvider(context)),
      window.registerTreeDataProvider('runme.launcher', new RunmeLauncherProvider())
    )

    /**
     * setup extension based on `pseudoterminal` experiment flag
     */
    const config = workspace.getConfiguration('runme.experiments')
    const hasPsuedoTerminalExperimentEnabled = config.get<boolean>('pseudoterminal')
    !hasPsuedoTerminalExperimentEnabled
      ? context.subscriptions.push(notebooks.registerNotebookCellStatusBarItemProvider('runme', new CliProvider()))
      : tasks.registerTaskProvider(RunmeTaskProvider.id, new RunmeTaskProvider(context))
  }
}
