
import { workspace, notebooks, commands, ExtensionContext, tasks } from 'vscode'

import { Kernel } from './kernel'
import { ShowTerminalProvider, BackgroundTaskProvider, StopBackgroundTaskProvider} from './provider/background'
import { CopyProvider } from './provider/copy'
import { resetEnv } from './utils'
import { CliProvider } from './provider/cli'
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


export class RunmeExtension {
  async initialize(context: ExtensionContext) {
    const kernel = new Kernel(context)
    context.subscriptions.push(
      kernel,
      workspace.registerNotebookSerializer('runme', new Serializer(context), {
        transientOutputs: true,
        transientCellMetadata: {
          inputCollapsed: true,
          outputCollapsed: true,
        },
      }),

      notebooks.registerNotebookCellStatusBarItemProvider('runme', new CopyProvider()),
      commands.registerCommand('runme.resetEnv', resetEnv),
      commands.registerCommand('runme.copyCellToClipboard', copyCellToClipboard),
      commands.registerCommand('runme.openSplitViewAsMarkdownText', openSplitViewAsMarkdownText),
      commands.registerCommand('runme.openAsRunmeNotebook', openAsRunmeNotebook),
      commands.registerCommand('runme.new', createNewRunmeNotebook)
    )

    /**
     * setup extension based on `pseudoterminal` experiment flag
     */
    const config = workspace.getConfiguration('runme.experiments')
    const hasPsuedoTerminalExperimentEnabled = config.get<boolean>('pseudoterminal')
    !hasPsuedoTerminalExperimentEnabled
      ? context.subscriptions.push(
        commands.registerCommand('runme.openTerminal', openTerminal),
        commands.registerCommand('runme.runCliCommand', runCLICommand),
        commands.registerCommand('runme.stopBackgroundTask', stopBackgroundTask),
        notebooks.registerNotebookCellStatusBarItemProvider('runme', new ShowTerminalProvider()),
        notebooks.registerNotebookCellStatusBarItemProvider('runme', new BackgroundTaskProvider()),
        notebooks.registerNotebookCellStatusBarItemProvider('runme', new StopBackgroundTaskProvider()),
        notebooks.registerNotebookCellStatusBarItemProvider('runme', new CliProvider())
      )
      : context.subscriptions.push(
        tasks.registerTaskProvider(RunmeTaskProvider.id, new RunmeTaskProvider(context))
      )
  }
}
