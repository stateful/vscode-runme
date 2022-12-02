
import { workspace, notebooks, commands, ExtensionContext } from 'vscode'

import { NewSerializer } from './notebook'
import { Kernel } from './kernel'
import { ShowTerminalProvider, BackgroundTaskProvider, StopBackgroundTaskProvider} from './provider/background'
import { CopyProvider } from './provider/copy'
import { resetEnv } from './utils'
import { CliProvider } from './provider/cli'
import {
  openTerminal,
  runCLICommand,
  copyCellToClipboard,
  openAsRunmeNotebook,
  openSplitViewAsMarkdownText ,
  stopBackgroundTask
} from './commands'


export class RunmeExtension {
  async initialise (context: ExtensionContext) {
    const kernel = new Kernel(context)
    context.subscriptions.push(
      kernel,
      workspace.registerNotebookSerializer('runme', new NewSerializer(context), {
        transientOutputs: true,
        transientCellMetadata: {
          inputCollapsed: true,
          outputCollapsed: true,
        },
      }),

      notebooks.registerNotebookCellStatusBarItemProvider('runme', new ShowTerminalProvider()),
      notebooks.registerNotebookCellStatusBarItemProvider('runme', new CliProvider()),
      notebooks.registerNotebookCellStatusBarItemProvider('runme', new BackgroundTaskProvider()),
      notebooks.registerNotebookCellStatusBarItemProvider('runme', new CopyProvider()),
      notebooks.registerNotebookCellStatusBarItemProvider('runme', new StopBackgroundTaskProvider()),
      commands.registerCommand('runme.resetEnv', resetEnv),
      commands.registerCommand('runme.openTerminal', openTerminal),
      commands.registerCommand('runme.runCliCommand', runCLICommand),
      commands.registerCommand('runme.copyCellToClipboard', copyCellToClipboard),
      commands.registerCommand('runme.stopBackgroundTask', stopBackgroundTask),
      commands.registerCommand('runme.openSplitViewAsMarkdownText', openSplitViewAsMarkdownText),
      commands.registerCommand('runme.openAsRunmeNotebook', openAsRunmeNotebook),
    )
  }
}
