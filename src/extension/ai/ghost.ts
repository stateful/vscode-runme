import * as vscode from 'vscode'

import getLogger from '../logger'
const log = getLogger()

const ghostKey = 'ghostCell'

const ghostDecoration = vscode.window.createTextEditorDecorationType({
  color: '#888888', // Light grey color
})

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

  // When a cell is selected we want to check if its a ghost cell and if so render it a non-ghost cell.
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(handleOnDidChangeActiveTextEditor),
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

  // We want to insert the new cells and get rid of any existing ghost cells.
  // The old cells may not be located at the same location as the new cells.
  // So we don't use replace.
  const startIndex = matchedCell.index + 1
  notebook.getCells().forEach((cell) => {
    if (isGhostCell(cell)) {
      const deleteCells = vscode.NotebookEdit.deleteCells(
        new vscode.NotebookRange(cell.index, cell.index + 1),
      )
      edits.push(deleteCells)
    }
  })

  const insertCells = vscode.NotebookEdit.insertCells(startIndex, newCellData)
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
  const textDoc = editor.document
  const range = new vscode.Range(
    textDoc.positionAt(0),
    textDoc.positionAt(textDoc.getText().length),
  )

  editor.setDecorations(ghostDecoration, [range])
}

function editorAsNonGhost(editor: vscode.TextEditor) {
  // To remove the decoration we set the range to an empty range and pass in a reference
  // to the original decoration
  // https://github.com/microsoft/vscode-extension-samples/blob/main/decorator-sample/USAGE.md#tips
  editor.setDecorations(ghostDecoration, [])
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

// handleOnDidChangeActiveTextEditor updates the ghostKey cell decoration and rendering
// when it is selected
function handleOnDidChangeActiveTextEditor(editor: vscode.TextEditor | undefined) {
  log.info(`onDidChangeActiveTextEditor Fired for editor ${editor?.document.uri}`)
  if (editor === undefined) {
    return
  }

  if (editor.document.uri.scheme !== 'vscode-notebook-cell') {
    // Doesn't correspond to a notebook cell so do nothing
    return
  }

  const cell = getCellFromCellDocument(editor.document)
  if (cell === undefined) {
    return
  }

  if (!isGhostCell(cell)) {
    return
  }

  const update = vscode.NotebookEdit.updateCellMetadata(cell.index, { [ghostKey]: false })
  const edit = new vscode.WorkspaceEdit()
  edit.set(editor.document.uri, [update])
  vscode.workspace.applyEdit(edit).then((result: boolean) => {
    log.trace(`updateCellMetadata to deactivate ghostcell resolved with ${result}`)
    if (!result) {
      log.error('applyEdit failed')
      return
    }
  })
  // If the cell is a ghost cell we want to remove the decoration
  // and replace it with a non-ghost cell.
  editorAsNonGhost(editor)
}
