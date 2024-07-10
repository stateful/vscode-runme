import * as vscode from 'vscode'

import getLogger from '../logger'
const log = getLogger()

const ghostKey = 'ghostCell'

// TODO(jeremy): I think we need to keep track of lastRange as a function of document
// because a user could be editing multiple documents at once.
var lastRange: vscode.NotebookRange = new vscode.NotebookRange(0, 0)

// registerGhostCellEvents should be called when the extension is activated.
// It registers event handlers to listen to when cells are added or removed
// as well as when cells change. This is used to create ghost cells.
export function registerGhostCellEvents(context: vscode.ExtensionContext) {
  // onDidChangeTextDocument fires when the contents of a cell changes.
  // We use this to generate completions.
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(handleOnDidChangeNotebookCell),
  )

  // onDidChangeVisibleTextEditors fires when the visible text editors change.
  // We need to trap this event to apply decorations to turn cells into ghost cells.
  context.subscriptions.push(
    vscode.window.onDidChangeVisibleTextEditors(handleOnDidChangeVisibleTextEditors),
  )
}

// handleOnDidChangeNotebookCell is called when the contents of a cell changes.
// We use this function to trigger the generation of completions in response to a user
// typing in a cell.
// N.B. This doesn't appear to get called when a cell is added to a notebook.
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
      metadata: {
        [ghostKey]: true,
      },
    },
  ]

  const edit = new vscode.WorkspaceEdit()
  const edits: vscode.NotebookEdit[] = []
  if (!lastRange.isEmpty) {
    // TODO(jeremy): Should we use replaceCells instead of deleteCells?
    // Would we end up triggering the OnDidChangeNotebookCell event again?
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

    // Apply renderings to the newly inserted ghost cells
    // TODO(jeremy): We are just assuming that activeNotebookEditor is the correct editor
    if (vscode.window.activeNotebookEditor?.notebook.uri !== notebook.uri) {
      log.error('activeNotebookEditor is not the same as the notebook that was edited')
    }
    //renderGhostCell(vscode.window.activeNotebookEditor!)
    if (!result) {
      log.error('applyEdit failed')
      return
    }
  })
}

// handleOnDidChangeVisibleTextEditors is called when the visible text editors change.
// This includes when a TextEditor is created.
function handleOnDidChangeVisibleTextEditors(editors: readonly vscode.TextEditor[]) {
  for (const editor of editors) {
    log.info(`onDidChangeVisibleTextEditors Fired for editor ${editor.document.uri}`)
    if (editor.document.uri.scheme !== 'vscode-notebook-cell') {
      log.info(`onDidChangeVisibleTextEditors Fired fo ${editor.document.uri}`)
      // Doesn't correspond to a notebook cell so do nothing
      continue
    }
    const cell = getCellFromCellDocument(editor.document)
    if (cell === undefined) {
      continue
    }

    if (!isGhostCell(cell)) {
      log.info(`Not a ghost editor doc:${cell.document.uri}`)
      continue
    }

    editorAsGhost(editor)
  }
}

// editorAsGhost decorates an editor as a ghost cell.
function editorAsGhost(editor: vscode.TextEditor) {
  const decoration = vscode.window.createTextEditorDecorationType({
    color: '#888888', // Light grey color
  })

  const textDoc = editor.document
  const range = new vscode.Range(
    textDoc.positionAt(0),
    textDoc.positionAt(textDoc.getText().length),
  )

  editor.setDecorations(decoration, [range])
}

function isGhostCell(cell: vscode.NotebookCell): boolean {
  const metadata = cell.metadata
  return metadata?.[ghostKey] === true
}

// getCellFromCellDocument returns the notebook cell that corresponds to a given text document.
// We do this by iterating over all notebook documents and cells to find the cell that has the same URI as the
// text document.
// TODO(jeremy): Should we cache this information?
function getCellFromCellDocument(textDoc: vscode.TextDocument): vscode.NotebookCell | undefined {
  var matchedCell: vscode.NotebookCell | undefined
  vscode.workspace.notebookDocuments.find((notebook) => {
    const cell = notebook.getCells().find((cell) => cell.document === textDoc)
    const result = Boolean(cell)
    if (cell !== undefined) {
      matchedCell = cell
    }
    return result
  })
  return matchedCell
}
