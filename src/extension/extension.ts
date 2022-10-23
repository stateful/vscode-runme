import vscode from 'vscode'

import { Serializer } from './notebook'
import { Kernel } from './kernel'
import { ViteServerProcess } from './server'
import { ShowTerminalProvider, BackgroundTaskProvider } from './provider/background'
import { PidStatusProvider } from './provider/pid'
import { CopyProvider } from './provider/copy'
import { getTerminalByCell, resetEnv } from './utils'
import { CliProvider } from './provider/cli'

const viteProcess = new ViteServerProcess()

export async function activate (context: vscode.ExtensionContext) {
  console.log('[Runme] Activating Extension')
  const kernel = new Kernel(context, viteProcess)

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
    vscode.notebooks.registerNotebookCellStatusBarItemProvider('runme', new CliProvider()),
    vscode.notebooks.registerNotebookCellStatusBarItemProvider('runme', new BackgroundTaskProvider()),
    vscode.notebooks.registerNotebookCellStatusBarItemProvider('runme', new CopyProvider()),
    vscode.commands.registerCommand('runme.openTerminal', (cell: vscode.NotebookCell) => {
      const terminal = getTerminalByCell(cell)
      if (!terminal) {
        return vscode.window.showWarningMessage('Couldn\'t find terminal! Was it already closed?')
      }
      return terminal.show()
    }),
    vscode.commands.registerCommand('runme.copyCellToClipboard', (cell: vscode.NotebookCell) => {
      vscode.env.clipboard.writeText(cell.document.getText())
      return vscode.window.showInformationMessage('Copied cell to clipboard!')
    }),

    vscode.commands.registerCommand('runme.runCliCommand', async (cell: vscode.NotebookCell) => {
      if (!await CliProvider.isCliInstalled()) {
        return vscode.window.showInformationMessage(
          'Runme CLI is not installed. Do you want to download it?',
          'Download now'
        ).then((openBrowser) => openBrowser && vscode.env.openExternal(
          vscode.Uri.parse('https://github.com/stateful/runme/releases')
        ))
      }
      const cliName: string = (cell.metadata?.['cliName'] || '').trim()
      const term = vscode.window.createTerminal(`CLI: ${cliName}`)
      term.show(false)
      term.sendText(`runme run ${cliName}`)
    }),

    vscode.commands.registerCommand('runme.resetEnv', resetEnv)
  )

  console.log('[Runme] Extension successfully activated')
}

// This method is called when your extension is deactivated
export function deactivate () {
  viteProcess.stop()
}
