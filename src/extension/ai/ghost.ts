import * as vscode from 'vscode'

import getLogger from '../logger'
const log = getLogger()

// TODO(jeremy): I think we need to keep track of lastRange as a function of document
// because a user could be editing multiple documents at once.
var lastRange: vscode.NotebookRange = new vscode.NotebookRange(0, 0)

// registerGhostCellEvents should be called when the extension is activated.
// It registers event handlers to listen to when cells are added or removed
// as well as when cells change. This is used to create ghost cells.
export function registerGhostCellEvents(context: vscode.ExtensionContext) {
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

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(handleOnDidChangeNotebookCell),
  )

  // TODO(jeremy): What is the difference between onDiDChangeVisibleNotebookEditors and
  // onDidChangeTextEditorVisibleRanges which one should we be using? Do we need to handle both?
  context.subscriptions.push(
    vscode.window.onDidChangeVisibleNotebookEditors(handleOnDidChangeVisibileNotebookEditors),
  )
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
    // TODO(jeremy): Should we use replaceCells instead of deleteCells?
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

    if (!result) {
      log.error('applyEdit failed')
      return
    }
  })
}

// handleOnDidChangeVisibileNotebookEditors is called when the visible notebook editors change.
// It gets the visibile ranges of the cells and adds a decoration to the cell to make ghost cells ghost cells.
function handleOnDidChangeVisibileNotebookEditors(editors: readonly vscode.NotebookEditor[]) {
  for (const editor of editors) {
    const notebook = editor.notebook
    if (notebook === undefined) {
      log.error('notebook is undefined')
      return
    }
    log.info(`onDidChangeVisibleNotebookEditors Fired for notebook ${notebook.uri}`)

    editor.visibleRanges.forEach((range) => {
      for (let i = range.start; i < range.end; i++) {
        // Get the cell and change the font
        const cell = editor.notebook.cellAt(i)
        const decoration = vscode.window.createTextEditorDecorationType({
          color: '#888888', // Light grey color
        })

        const range = new vscode.Range(
          cell.document.positionAt(0),
          cell.document.positionAt(cell.document.getText().length),
        )

        // Find the TextEditor for this cell
        const cellTextEditor = vscode.window.visibleTextEditors.find(
          (editor) => editor.document.uri.toString() === cell.document.uri.toString(),
        )
        if (cellTextEditor === undefined) {
          log.error(`cellTextEditor for cell ${cell.document.uri} NOT found`)
          return
        }
        cellTextEditor.setDecorations(decoration, [range])
      }
    })
  }
}
