import path from 'node:path'

import {
  NotebookCell, Uri, window, env, NotebookDocument, TextDocument, ViewColumn,
  workspace, NotebookData, commands, NotebookCellData, NotebookCellKind
} from 'vscode'

import { Kernel } from '../kernel'
import { CliProvider } from '../provider/cli'
import { getAnnotations, getTerminalByCell } from '../utils'

function showWarningMessage () {
  return window.showWarningMessage('Couldn\'t find terminal! Was it already closed?')
}

export function openTerminal (cell: NotebookCell) {
  const terminal = getTerminalByCell(cell)
  if (!terminal) {
    return showWarningMessage()
  }
  return terminal.show()
}

export function copyCellToClipboard (cell: NotebookCell) {
  env.clipboard.writeText(cell.document.getText())
  return window.showInformationMessage('Copied cell to clipboard!')
}

export function stopBackgroundTask (cell: NotebookCell) {
  const terminal = getTerminalByCell(cell)
  if (!terminal) {
    return showWarningMessage()
  }
  terminal.dispose()
  return window.showInformationMessage(`${terminal?.name} task terminated!`)
}

export async function runCLICommand (cell: NotebookCell) {
  if (!await CliProvider.isCliInstalled()) {
    return window.showInformationMessage(
      'Runme CLI is not installed. Do you want to download it?',
      'Download now'
    ).then((openBrowser) => openBrowser && env.openExternal(
      Uri.parse('https://github.com/stateful/runme/releases')
    ))
  }
  const annotations = getAnnotations(cell)
  const term = window.createTerminal(`CLI: ${annotations.name}`)
  const args = [
    `--chdir="${path.dirname(cell.document.uri.fsPath)}"`,
    `--filename="${path.basename(cell.document.uri.fsPath)}"`
  ]
  term.show(false)
  term.sendText(`runme run ${annotations.name} ${args.join(' ')}`)
}

export function openAsRunmeNotebook (doc: NotebookDocument) {
  window.showNotebookDocument(doc, {
    viewColumn: ViewColumn.Active
  })
}

export function openSplitViewAsMarkdownText (doc: TextDocument) {
  window.showTextDocument(doc, {
    viewColumn: ViewColumn.Beside
  })
}

export async function createNewRunmeNotebook () {
  const newNotebook = await workspace.openNotebookDocument(
    Kernel.type,
    new NotebookData([
      new NotebookCellData(
        NotebookCellKind.Markup,
        '# Runme Notebook\n\nDouble-click and start writing here...',
        'markdown'
      ),
      new NotebookCellData(NotebookCellKind.Code, 'echo "Hello World"', 'sh'),
      new NotebookCellData(
        NotebookCellKind.Markup,
        '*Read the docs on [runme.dev](https://www.runme.dev/docs/intro)' +
          ' to learn how to get most out of Runme notebooks!*',
        'markdown'
      ),
    ])
  )
  await commands.executeCommand('vscode.openWith', newNotebook.uri, Kernel.type)
}
