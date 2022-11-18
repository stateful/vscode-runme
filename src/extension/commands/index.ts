import path from 'node:path'

import {
  NotebookCell, Uri, window, env, NotebookDocument, TextDocument, ViewColumn, ExtensionContext,
  QuickPickItem,
  workspace,
  commands
} from 'vscode'

import { CliProvider } from '../provider/cli'
import { getTerminalByCell } from '../utils'
import { STATE_VERSION_KEY } from '../constants'
import type { DocumentVersionEntry } from '../types'

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
  const cliName: string = (cell.metadata?.['cliName'] || '').trim()
  const term = window.createTerminal(`CLI: ${cliName}`)
  term.show(false)
  term.sendText(`runme run ${cliName} --chdir="${path.dirname(cell.document.uri.fsPath)}"`)
}
export function openAsRunmeNotebook (doc: NotebookDocument) {
  window.showNotebookDocument(doc, {
    viewColumn: ViewColumn.Beside
  })
}

export function openSplitViewAsMarkdownText (doc: TextDocument) {
  window.showTextDocument(doc, {
    viewColumn: ViewColumn.Beside
  })
}

class VersionSelection implements QuickPickItem {
  public label: string
  public content: string
  constructor (version: DocumentVersionEntry) {
    this.label = `Create at ${new Date(version.createdAt)}`
    this.content = version.content
  }
}

export function loadEarlierVersion (context: ExtensionContext) {
  return async () => {
    if (!window.activeNotebookEditor) {
      return window.showWarningMessage('No Runme notebook currently opened')
    }

    const versionedDocuments = context.globalState.get<Record<string, DocumentVersionEntry[]>>(
      STATE_VERSION_KEY, {}
    )
    const currentDocumentPath = window.activeNotebookEditor.notebook.uri.fsPath
    const documentVersions = versionedDocuments[currentDocumentPath] || []

    if (documentVersions.length === 0) {
      return window.showInformationMessage('No older version of this document exist')
    }

    const qp = await window.showQuickPick<VersionSelection>(
      documentVersions.map((v) => new VersionSelection(v)))

    if (!qp) {
      return
    }

    workspace.fs.writeFile(Uri.parse(currentDocumentPath), Buffer.from(qp.content))
    await commands.executeCommand('workbench.action.closeActiveEditor')
    return commands.executeCommand('vscode.open', Uri.parse(currentDocumentPath))
  }
}

export function clearVersionHistory (context: ExtensionContext) {
  return () => context.globalState.update(STATE_VERSION_KEY, {})
}
