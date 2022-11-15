
import { workspace, notebooks, commands, ExtensionContext } from 'vscode'

import { Serializer } from './notebook'
import { Kernel } from './kernel'
// import { ViteServerProcess } from './server'
import { ShowTerminalProvider, BackgroundTaskProvider } from './provider/background'
import { PidStatusProvider } from './provider/pid'
import { CopyProvider } from './provider/copy'
import { resetEnv } from './utils'
import { CliProvider } from './provider/cli'
import { 
  openTerminal, 
  runCLICommand, 
  copyCellToClipboard, 
  openAsRunmeNotebook, 
  openSplitViewAsMarkdownText 
} from './commands'

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand('runme.openSplitViewAsMarkdownText', openSplitViewAsMarkdownText),
    commands.registerCommand('runme.openAsRunmeNotebook', openAsRunmeNotebook),
  )
}
export function deactivate() {}

export class RunmeExtension {
  async initialise (context: ExtensionContext) {
    const kernel = new Kernel(context)
    // const viteProcess = new ViteServerProcess()
    // await viteProcess.start()

    context.subscriptions.push(
      kernel,
      // viteProcess,
      workspace.registerNotebookSerializer('runme', new Serializer(context), {
        transientOutputs: true,
        transientCellMetadata: {
          inputCollapsed: true,
          outputCollapsed: true,
        },
      }),

      notebooks.registerNotebookCellStatusBarItemProvider('runme', new ShowTerminalProvider()),
      notebooks.registerNotebookCellStatusBarItemProvider('runme', new PidStatusProvider()),
      notebooks.registerNotebookCellStatusBarItemProvider('runme', new CliProvider()),
      notebooks.registerNotebookCellStatusBarItemProvider('runme', new BackgroundTaskProvider()),
      notebooks.registerNotebookCellStatusBarItemProvider('runme', new CopyProvider()),
      commands.registerCommand('runme.resetEnv', resetEnv),
      commands.registerCommand('runme.openTerminal', openTerminal),
      commands.registerCommand('runme.runCliCommand', runCLICommand),
      commands.registerCommand('runme.copyCellToClipboard', copyCellToClipboard),
      commands.registerCommand('runme.openSplitViewAsMarkdownText', openSplitViewAsMarkdownText),
      commands.registerCommand('runme.openAsRunmeNotebook', openAsRunmeNotebook),
    )
  }
}
