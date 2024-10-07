import * as vscode from 'vscode'
import * as agent_pb from '@buf/jlewi_foyle.bufbuild_es/foyle/v1alpha1/agent_pb'

import getLogger from '../logger'
import * as serializer from '../serializer'
import { RUNME_CELL_ID } from '../constants'

import * as converters from './converters'
import * as stream from './stream'
import * as protos from './protos'
import { SessionManager } from './sessions'
import { getEventReporter } from './events'

const log = getLogger()

// n.b. using the prefix _ or runme.dev indicates the metadata is ephemeral and shouldn't
// be persisted to the markdown file. This ensures that if a ghost cell is accepted
// the ghost metadata is not persisted to the markdown file.
export const ghostKey = '_ghostCell'
export const ghostCellKindKey = '_ghostCellKind'

const ghostDecoration = vscode.window.createTextEditorDecorationType({
  color: '#888888', // Light grey color
})

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

  // contextID is the ID of the context we are generating completions for.
  // It is used to detect whether a completion response is stale and should be
  // discarded because the context has changed.

  constructor() {
    this.notebookState = new Map<vscode.Uri, NotebookState>()
    // Generate a random context ID. This should be unnecessary because presumable the event to change
    // the active cell will be sent before any requests are sent but it doesn't hurt to be safe.
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
        contextId: SessionManager.getManager().getID(),
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
        contextId: SessionManager.getManager().getID(),
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
    if (response.contextId !== SessionManager.getManager().getID()) {
      // TODO(jeremy): Is this logging too verbose?
      log.info(
        `Ignoring response with contextID ${response.contextId} because it doesn't match the current contextID ${SessionManager.getManager().getID()}`,
      )
      return
    }

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

      if (cell.kind === vscode.NotebookCellKind.Markup) {
        // In order to render markup cells as ghost cells we need to convert them to code cells.
        // Otherwise they don't get inserted in edit mode and we can't apply the decoration.
        cell.metadata[ghostCellKindKey] = GhostCellKind.Markdown
        cell.languageId = 'markdown'
        cell.kind = vscode.NotebookCellKind.Code
      } else {
        cell.metadata[ghostCellKindKey] = GhostCellKind.Code
      }
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

  // handleOnDidChangeActiveTextEditor updates the ghostKey cell decoration and rendering
  // when it is selected
  handleOnDidChangeActiveTextEditor = (editor: vscode.TextEditor | undefined) => {
    const oldCID = SessionManager.getManager().getID()
    // We need to generate a new context ID because the context has changed.
    const contextID = SessionManager.getManager().newID()
    log.info(
      `onDidChangeActiveTextEditor fired: editor: ${editor?.document.uri}; new contextID: ${contextID}; old contextID: ${oldCID}`,
    )
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

    const ghostKind = getGhostCellKind(cell)
    if (ghostKind === GhostCellKind.Markdown) {
      // Since this is actually a markdown cell we need to replace the cell in order to convert it
      // to a markdown cell.
      markupCellAsNonGhost(cell)
    } else if (cell.kind === vscode.NotebookCellKind.Code) {
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

    const event = new agent_pb.LogEvent()
    event.type = agent_pb.LogEventType.ACCEPTED
    event.contextId = oldCID
    event.selectedId = cell.metadata?.[RUNME_CELL_ID]
    event.selectedIndex = cell.index
    getEventReporter().reportEvents([event])
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

    this.streamCreator.handleEvent(
      new stream.CellChangeEvent(notebook.uri.toString(), matchedCell.index),
    )
  }
}

// handleOnDidChangeVisibleTextEditors is called when the visible text editors change.
// This includes when a TextEditor is created. I also think it can be the result of scrolling.
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
  //
  // Important: ghostDecoration must be a reference to the same object that was used to create the decoration.
  // that's how VSCode knows which decoration to remove. If you use a "copy" (i.e. a decoration with the same value)
  // the decoration won't get removed.
  editor.setDecorations(ghostDecoration, [])
}

function isGhostCell(cell: vscode.NotebookCell): boolean {
  const metadata = cell.metadata
  return metadata?.[ghostKey] === true
}

enum GhostCellKind {
  Code = 'CODE',
  Markdown = 'MARKDOWN',
  None = 'NONE',
}

// getGhostCellKind returns the kind of cell that should be used for a ghost cell.
function getGhostCellKind(cell: vscode.NotebookCell): GhostCellKind {
  const metadata = cell.metadata
  if (metadata === undefined) {
    return GhostCellKind.None
  }
  if (metadata[ghostCellKindKey] === undefined) {
    return GhostCellKind.None
  }
  return metadata[ghostCellKindKey]
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

// markupCellAsNonGhost replaces a ghost markup cell with a non-ghost cell.
// Since we render the markup cell as a code cell in order to make the ghost rendering apply
// to the markup cell we need to replace the cell in order to change the cell type back to markdown.
function markupCellAsNonGhost(cell: vscode.NotebookCell) {
  const edit = new vscode.WorkspaceEdit()
  // ...cell.metadata creates a shallow copy of the metadata object
  const updatedMetadata = { ...cell.metadata, [ghostKey]: false }
  const newCell = new vscode.NotebookCellData(
    vscode.NotebookCellKind.Markup, // New cell type (code or markdown)
    cell.document.getText(), // Cell content
    cell.document.languageId, // Language of the cell content
  )

  newCell.metadata = updatedMetadata
  const notebook = cell.notebook
  const index = notebook.getCells().indexOf(cell)

  const editReplace = vscode.NotebookEdit.replaceCells(new vscode.NotebookRange(index, index + 1), [
    newCell,
  ])

  edit.set(notebook.uri, [editReplace])
  vscode.workspace.applyEdit(edit)
}
