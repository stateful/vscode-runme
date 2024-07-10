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

  // onDidChangeTextEditorVisibleRanges fires when the notebook editor changes; the notebook editor
  // is for the entire notebook (i.e. one editor per file).
  context.subscriptions.push(
    vscode.window.onDidChangeVisibleNotebookEditors(handleOnDidChangeVisibileNotebookEditors),
  )

  // onDidChangeNotebookEditorVisibleRanges fires when the visible ranges of the notebook editor changes.
  // context.subscriptions.push(
  //   vscode.window.onDidChangeNotebookEditorVisibleRanges(handleOnDidChangeTextEditorVisibleRanges),
  // )

  // Check for new editors whenever the visible editors change
  context.subscriptions.push(
    vscode.window.onDidChangeVisibleTextEditors(handleOnDidChangeVisibleTextEditors),
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
      metadata: {
        [ghostKey]: true,
      },
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

// handleOnDidChangeTextEditorVisibleRanges is called when the visible ranges of the notebook editor changes.
// function handleOnDidChangeTextEditorVisibleRanges(
//   event: vscode.NotebookEditorVisibleRangesChangeEvent,
// ) {
//   // We need to update decorations for any ghost cells
//   log.info('onDidChangeTextEditorVisibleRanges calling renderGhostCell')
//   renderGhostCell(event.notebookEditor)
// }

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

// handleOnDidChangeVisibileNotebookEditors is called when the visible notebook editors changes.
// The notebook editor corresponds to the entire file. So this event is fired when the user switches
// between notebooks e.g. from doc1.md to doc2.md.
//
// TODO(jeremy): Do we need to handle this event and call renderGhostCell? Is handleOnDidChangeTextEditorVisibleRanges
// sufficient to handle rendering of ghost cells?
function handleOnDidChangeVisibileNotebookEditors(editors: readonly vscode.NotebookEditor[]) {
  for (const editor of editors) {
    const notebook = editor.notebook
    if (notebook === undefined) {
      log.error('notebook is undefined')
      return
    }
    log.info(`onDidChangeVisibleNotebookEditors Fired for notebook ${notebook.uri}`)

    renderGhostCell(editor)
  }
}

// renderGhostCell applies ghost cell decorations to any visible cells in a notebook.
// TextDecorations are properties of TextEditors. Each notebook cell gets its own TextEditor.
// However, the TextEditor for a cell are only guaranteed to exist when the cell is visible.
// This function gets the visible range in a notebook and applies a decoration to each cell in the range.
function renderGhostCell(editor: vscode.NotebookEditor) {
  const notebook = editor.notebook
  if (notebook === undefined) {
    log.error('notebook is undefined')
    return
  }

  // Create a map of the URI to visible textEditors
  const visibleTextEditors = new Map<string, vscode.TextEditor>()
  vscode.window.visibleTextEditors.forEach((textEditor) => {
    const uri = textEditor.document.uri.toString()
    log.info(`Visible Editor For URI: ${uri}`)
    visibleTextEditors.set(uri, textEditor)
  })

  editor.visibleRanges.forEach((range) => {
    log.info(`Visible Range: ${range.start} : ${range.end}`)
    for (let i = range.start; i < range.end; i++) {
      // Get the cell and change the font
      const cell = editor.notebook.cellAt(i)

      if (!isGhostCell(cell)) {
        log.info(`Not a ghost cell index: ${i} doc:${cell.document.uri}`)
        continue
      }

      // vscode.window.visibleTextEditors.forEach((textEditor) => {
      //   log.info(`Visible Editor: ${textEditor.document.uri.toString()}`)

      //   const cells  = editor.notebook.getCells()
      //   for (let i = 0; i < cells.length; i++) {
      //       if (cell.document.uri.toString() === textEditor.document.uri.toString()) {
      //         log.info(`Found cell for editor ${textEditor.document.uri.toString()}`)
      //       }
      //     })
      //   }
      // })
      // Find the TextEditor for this cell
      // const cellTextEditor = vscode.window.visibleTextEditors.find((editor) => {
      //   editor.document.uri.toString() === cell.document.uri.toString()
      // })
      const cellTextEditor = visibleTextEditors.get(cell.document.uri.toString())
      if (cellTextEditor === undefined) {
        log.error(`cellTextEditor for cell index: ${i}  URI: ${cell.document.uri} NOT found`)
        return
      }
      editorAsGhost(cellTextEditor)
    }
  })
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

  // // Find the TextEditor for this cell
  // const cellTextEditor = vscode.window.visibleTextEditors.find(
  //   (editor) => editor.document.uri.toString() === cell.document.uri.toString(),
  // )
  // if (cellTextEditor === undefined) {
  //   log.error(`cellTextEditor for cell ${cell.document.uri} NOT found`)
  //   return
  // }
  //log.info(`Applying ghost decoration to cell index: ${i} doc:${cell.document.uri}`)
  editor.setDecorations(decoration, [range])
}

function isGhostCell(cell: vscode.NotebookCell): boolean {
  const metadata = cell.metadata
  return metadata?.[ghostKey] === true
}

// getCellFromCellDocument returns the notebook cell that corresponds to a given text document.
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
