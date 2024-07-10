import * as vscode from 'vscode'

import getLogger from '../logger'
const log = getLogger()

// TODO(jeremy): I think we need to keep track of lastRange as a function of document
// because a user could be editing multiple documents at once.
var lastRange: vscode.NotebookRange = new vscode.NotebookRange(0, 0)

// registerGhostCellEvents should be called when the extension is activated.
// It registers event handlers to listen to when cells are added or removed
// as well as when cells change. This is used to create ghost cells.
export function registerGhostCellEvents() {
  vscode.workspace.onDidOpenTextDocument((doc) => {
    if (doc.uri.scheme !== 'vscode-notebook-cell') {
      // ignore other open events
      return
    }
    const notebook = vscode.workspace.notebookDocuments.find((notebook) => {
      const cell = notebook.getCells().find((cell) => cell.document === doc)
      return Boolean(cell)
    })
    if (notebook === undefined) {
      log.error(`notebook for cell ${doc.uri} NOT found`)
      return
    }
    log.info(
      `onDidOpenTextDocument Fired for notebook ${doc.uri} found; this should fire when a cell is added to a notebook`,
    )
  })

  vscode.workspace.onDidChangeTextDocument(handleOnDidChangeNotebookCell)
}

function handleOnDidChangeNotebookCell(event: vscode.TextDocumentChangeEvent) {
  if (event.document.uri.scheme !== 'vscode-notebook-cell') {
    // ignore other open events
    return
  }
  var matchedCell: vscode.NotebookCell | undefined

  // TODO(jeremy): Is there a more efficient way to find the cell and notebook?
  // Could we cache it somewhere.
  const notebook = vscode.workspace.notebookDocuments.find((notebook) => {
    const cell = notebook.getCells().find((cell) => cell.document === event.document)
    const result = Boolean(cell)
    if (cell !== undefined) {
      matchedCell = cell
    }
    return result
  })
  if (notebook === undefined) {
    log.error(`notebook for cell ${event.document.uri} NOT found`)
    return
  }

  if (matchedCell === undefined) {
    log.error(`cell for document ${event.document.uri} NOT found`)
    return
  }

  matchedCell.index
  log.info(
    `onDidChangeTextDocument Fired for notebook ${event.document.uri}; reason ${event.reason} ` +
      'this should fire when a cell is added to a notebook',
  )
  log.info(`onDidChangeTextDocument: latest contents ${event.document.getText()}`)

  const newCellData: vscode.NotebookCellData[] = [
    {
      languageId: 'bash',
      kind: vscode.NotebookCellKind.Code,
      value: 'This is ghost text: input was:\n' + event.document.getText(),
    },
  ]
  const edit = new vscode.WorkspaceEdit()
  const edits: vscode.NotebookEdit[] = []
  if (!lastRange.isEmpty) {
    log.info(`Deleting lastRange: ${lastRange.start} ${lastRange.end}`)
    // If there was previously a range added delete it.
    const deleteCells = vscode.NotebookEdit.deleteCells(lastRange)
    edits.push(deleteCells)
  }
  const startIndex = matchedCell.index + 1
  const insertCells = vscode.NotebookEdit.insertCells(startIndex, newCellData)
  // Update lastRange to the new range
  lastRange = new vscode.NotebookRange(startIndex, startIndex + newCellData.length)
  edits.push(insertCells)
  edit.set(event.document.uri, edits)
  vscode.workspace.applyEdit(edit).then((result: boolean) => {
    log.trace(`applyedit resolved with ${result}`)
  })
}
