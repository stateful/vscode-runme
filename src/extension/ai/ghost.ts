import * as vscode from 'vscode'
import * as agent_pb from '@buf/jlewi_foyle.bufbuild_es/foyle/v1alpha1/agent_pb'

import getLogger from '../logger'
import * as serializer from '../serializer'

import * as converters from './converters'
import * as stream from './stream'
import * as protos from './protos'

const log = getLogger()

// n.b. using the prefix _ or runme.dev indicates the metadata is ephemeral and shouldn't
// be persisted to the markdown file. This ensures that if a ghost cell is accepted
// the ghost metadata is not persisted to the markdown file.
export const ghostKey = '_ghostCell'

// TODO(jeremy): How do we handle multiple notebooks? Arguably you should only be generating
// completions for the active notebook. So as soon as the active notebook changes we should
// stop generating completions for the old notebook and start generating completions for the new notebook.

// GhostCellGenerator is a class that generates completions for a notebook cell.
// This class implements the stream.CompletionHandlers. It is responsible
// for generating a request to the AIService given an event and it is
// also responsible for applying the changes to the notebook.
//
// Generating a request to the AIService is stateful because the data that gets sent
// depends on whether this is the first request for a given selected cell in which
// case we send the full notebook or if it is an incremental change because
// the cell contents have changed.
export class GhostCellGenerator implements stream.CompletionHandlers {
  private notebookState: Map<vscode.Uri, NotebookState>

  constructor() {
    this.notebookState = new Map<vscode.Uri, NotebookState>()
  }

  // Updated method to check and initialize notebook state
  private getNotebookState(notebook: vscode.NotebookDocument): NotebookState {
    if (!this.notebookState.has(notebook.uri)) {
      this.notebookState.set(notebook.uri, new NotebookState())
    }
    return this.notebookState.get(notebook.uri)!
  }

  // textDocumentChangeEventToCompletionRequest converts a VSCode TextDocumentChangeEvent to a Request proto.
  // This is a stateful transformation because we need to decide whether to send the full document or
  // the incremental changes.  It will return a null request if the event should be ignored or if there
  // is an error preventing it from computing a proper request.
  buildRequest(
    cellChangeEvent: stream.CellChangeEvent,
    firstRequest: boolean,
  ): agent_pb.StreamGenerateRequest | null {
    // TODO(jeremy): Is there a more efficient way to find the cell and notebook?
    // Can we cache it in the class? Since we keep track of notebooks in NotebookState
    // Is there a way we can go from the URI of the cell to the URI of the notebook directly
    const notebook = vscode.workspace.notebookDocuments.find((notebook) => {
      // We need to do the comparison on the actual values so we use the string.
      // If we just used === we would be checking if the references are to the same object.
      return notebook.uri.toString() === cellChangeEvent.notebookUri
    })

    if (notebook === undefined) {
      log.error(`notebook for cell ${cellChangeEvent.notebookUri} NOT found`)
      // TODO(jermey): Should we change the return type to be nullable?
      return null
    }

    // Get the notebook state; this will initialize it if this is the first time we
    // process an event for this notebook.
    let nbState = this.getNotebookState(notebook)

    // TODO(jeremy): We should probably at the cellUri to the event so we can verify the cell URI matches
    let matchedCell = notebook.cellAt(cellChangeEvent.cellIndex)

    // Has the cell changed since the last time we processed an event?
    let newCell = true
    if (nbState.activeCell?.document.uri === matchedCell?.document.uri) {
      newCell = false
    }

    log.info(`buildRequest: is newCell: ${newCell} , firstRequest: ${firstRequest}`)

    // Update notebook state
    nbState.activeCell = matchedCell
    this.notebookState.set(notebook.uri, nbState)

    if (newCell || firstRequest) {
      // Generate a new request

      // Notebook uses the vscode interface types NotebookDocument and NotebookCell. We
      // need to convert this to NotebookCellData which is the concrete type used by the serializer.
      // This allows us to reuse the existing serializer code.
      let cellData = notebook.getCells().map((cell) => converters.cellToCellData(cell))
      let notebookData = new vscode.NotebookData(cellData)

      let notebookProto = serializer.GrpcSerializer.marshalNotebook(notebookData)
      let request = new agent_pb.StreamGenerateRequest({
        request: {
          case: 'fullContext',
          value: new agent_pb.FullContext({
            notebook: protos.notebookTSToES(notebookProto),
            selected: matchedCell.index,
            notebookUri: notebook.uri.toString(),
          }),
        },
      })

      return request
    } else {
      let cellData = converters.cellToCellData(matchedCell)
      let notebookData = new vscode.NotebookData([cellData])

      let notebookProto = serializer.GrpcSerializer.marshalNotebook(notebookData)
      let notebook = protos.notebookTSToES(notebookProto)
      // Generate an update request
      let request = new agent_pb.StreamGenerateRequest({
        request: {
          case: 'update',
          value: new agent_pb.UpdateContext({
            cell: notebook.cells[0],
          }),
        },
      })

      return request
    }
  }

  // processResponse applies the changes from the response to the notebook.
  processResponse(response: agent_pb.StreamGenerateResponse) {
    let cellsTs = protos.cellsESToTS(response.cells)
    let newCellData = converters.cellProtosToCellData(cellsTs)

    const edit = new vscode.WorkspaceEdit()
    const edits: vscode.NotebookEdit[] = []

    if (response.notebookUri === undefined || response.notebookUri.toString() === '') {
      log.error('notebookUri is undefined')
      return
    }

    const notebook = vscode.workspace.notebookDocuments.find((notebook) => {
      return notebook.uri.toString() === response.notebookUri
    })

    if (notebook === undefined) {
      // Could this happen e.g because the notebook was closed?
      console.log(`notebook for cell ${response.notebookUri} NOT found`)
      return
    }

    // We want to insert the new cells and get rid of any existing ghost cells.
    // The old cells may not be located at the same location as the new cells.
    // So we don't use replace.
    const startIndex = response.insertAt
    notebook.getCells().forEach((cell) => {
      if (isGhostCell(cell)) {
        const deleteCells = vscode.NotebookEdit.deleteCells(
          new vscode.NotebookRange(cell.index, cell.index + 1),
        )
        edits.push(deleteCells)
      }
    })

    // Mark all newCells as ghost cells
    newCellData.forEach((cell) => {
      if (cell.metadata === undefined) {
        cell.metadata = {}
      }
      cell.metadata[ghostKey] = true
    })

    const insertCells = vscode.NotebookEdit.insertCells(startIndex, newCellData)
    edits.push(insertCells)
    edit.set(notebook.uri, edits)
    vscode.workspace.applyEdit(edit).then((result: boolean) => {
      log.trace(`applyedit resolved with ${result}`)

      // Apply renderings to the newly inserted ghost cells
      // TODO(jeremy): We are just assuming that activeNotebookEditor is the correct editor
      if (vscode.window.activeNotebookEditor?.notebook.uri !== notebook.uri) {
        log.error('activeNotebookEditor is not the same as the notebook that was edited')
      }
      if (!result) {
        log.error('applyEdit failed')
        return
      }
    })
  }

  shutdown(): void {
    log.info('Shutting down')
  }
}

// NotebookState keeps track of state information for a given notebook.
class NotebookState {
  public activeCell: vscode.NotebookCell | null
  constructor() {
    this.activeCell = null
  }
}

// CellChangeEventGenerator is a class that generates events when a cell changes.
// It converts vscode.TextDocumentChangeEvents into a stream.CellChangeEvent
// and then enques them in the StreamCreator.
export class CellChangeEventGenerator {
  streamCreator: stream.StreamCreator

  constructor(streamCreator: stream.StreamCreator) {
    this.streamCreator = streamCreator
  }

  handleOnDidChangeNotebookCell = (event: vscode.TextDocumentChangeEvent) => {
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
      `onDidChangeTextDocument Fired for notebook ${event.document.uri}` +
        'this should fire when a cell is added to a notebook',
    )

    this.streamCreator.handleEvent(
      new stream.CellChangeEvent(notebook.uri.toString(), matchedCell.index),
    )
  }
}

// handleOnDidChangeVisibleTextEditors is called when the visible text editors change.
// This includes when a TextEditor is created.
export function handleOnDidChangeVisibleTextEditors(editors: readonly vscode.TextEditor[]) {
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

  editor.setDecorations(getGhostDecoration(), [range])
}

function editorAsNonGhost(editor: vscode.TextEditor) {
  // To remove the decoration we set the range to an empty range and pass in a reference
  // to the original decoration
  // https://github.com/microsoft/vscode-extension-samples/blob/main/decorator-sample/USAGE.md#tips
  editor.setDecorations(getGhostDecoration(), [])
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
export function handleOnDidChangeActiveTextEditor(editor: vscode.TextEditor | undefined) {
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
  // ...cell.metadata creates a shallow copy of the metadata object
  const updatedMetadata = { ...cell.metadata, [ghostKey]: false }
  const update = vscode.NotebookEdit.updateCellMetadata(cell.index, updatedMetadata)
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

// n.b. this is a function and not a top level const because that causes problems with the vitest
// mocking framework.
// N.B. I think we could potentially have solved that by doing something like
// https://github.com/stateful/vscode-runme/pull/1475#issuecomment-2278636467
function getGhostDecoration(): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({
    color: '#888888', // Light grey color
  })
}
