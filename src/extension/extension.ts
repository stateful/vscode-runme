import vscode from 'vscode'
import { Serializer } from './notebook'
import { Kernel } from './kernel'
import { ViteServerProcess } from './server'
import { ShowTerminalProvider, BackgroundTaskProvider } from './provider/background'
import { PidStatusProvider } from './provider/pid'
import { getTerminalByCell } from './utils'

const viteProcess = new ViteServerProcess()

export async function activate (context: vscode.ExtensionContext) {
  console.log('[Runme] Activating Extension')
  const kernel = new Kernel(context)

  await viteProcess.start()
  context.subscriptions.push(
    kernel,
    viteProcess,
    vscode.workspace.registerNotebookSerializer('runme', new Serializer(context), {
      transientOutputs: true,
      transientCellMetadata: {
        inputCollapsed: true,
        outputCollapsed: true,
      },
    }),
    vscode.notebooks.registerNotebookCellStatusBarItemProvider('runme', new ShowTerminalProvider()),
    vscode.notebooks.registerNotebookCellStatusBarItemProvider('runme', new PidStatusProvider()),
    vscode.notebooks.registerNotebookCellStatusBarItemProvider('runme', new BackgroundTaskProvider()),
    vscode.commands.registerCommand('runme.openTerminal', (cell: vscode.NotebookCell) => {
      const terminal = getTerminalByCell(cell)
      if (!terminal) {
        return vscode.window.showWarningMessage('Couldn\'t find terminal! Was it already closed?')
      }
      return terminal.show()
    })
  )

  console.log('[Runme] Extension successfully activated')
}

// This method is called when your extension is deactivated
export function deactivate () {
  viteProcess.stop()
}
