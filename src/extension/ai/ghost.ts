import * as vscode from 'vscode'
import * as rxjs from 'rxjs'
import * as stream from './stream'
import getLogger from '../logger'
import * as agent_pb from './foyle/v1alpha1/agent_pb'
import * as doc_pb from './foyle/v1alpha1/doc_pb'
const log = getLogger()

const ghostKey = 'ghostCell'

const ghostDecoration = vscode.window.createTextEditorDecorationType({
  color: '#888888', // Light grey color
})

import { fromEventPattern } from 'rxjs'
import { StreamResponse } from '@bufbuild/connect'

// TODO(jeremy): How do we handle multiple notebooks? Arguably you should only be generating
// completions for the active notebook. So as soon as the active notebook changes we should
// stop generating completions for the old notebook and start generating completions for the new notebook.

// registerGhostCellEvents should be called when the extension is activated.
// It registers event handlers to listen to when cells are added or removed
// as well as when cells change. This is used to create ghost cells.
export function registerGhostCellEvents(context: vscode.ExtensionContext) {
  let cellGenerator = new GhostCellGenerator()

  // Create a stream creator. The StreamCreator is a class that effectively windows events
  // and turns each window into an AsyncIterable of streaming requests.
  let creator = new stream.StreamCreator(cellGenerator)

  let eventGenerator = new CellChangeEventGenerator(creator)
  // onDidChangeTextDocument fires when the contents of a cell changes.
  // We use this to generate completions.
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(eventGenerator.handleOnDidChangeNotebookCell),
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

// createRegisterOnDidChangeTextDocumentHandler is a factory function that creates a function
// that will register the observable handler for the onDidChangeTextDocument event.
// The reason we need to use a factory function is that we need to pass in the vscode context
// so we can add the subscription to the list of subscriptions so they can be properly disposed
// of
// function createRegisterOnDidChangeTextDocumentHandler(
//   context: vscode.ExtensionContext,
// ): (observableHandler: (event: vscode.TextDocumentChangeEvent) => void) => void {
//   // registerOnDidChangeTextDocumentHandler will be used to register the observable handler
//   // for the onDidChangeTextDocument event. This function will be invoked by the observable
//   // handler when a subscription is created. The argument, observableHandler, will be
//   // a function that will add the events to the observable.
//   return function registerOnDidChangeTextDocumentHandler(
//     observableHandler: (event: vscode.TextDocumentChangeEvent) => void,
//   ) {
//     context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(observableHandler))
//   }
// }

// GhostCellGenerator is a class that generates completions for a notebook cell.
// This class implements the stream.CompletionHandlers. It is responsible
// for generating a request to the AIService given an event and it is
// also responsible for applying the changes to the notebook.
//
// Generating a request to the AIService is stateful because the data that gets sent
// depends on whether this is the first request for a given selected cell in which
// case we send the full notebook or if it is an incremental change because
// the cell contents have changed.
class GhostCellGenerator implements stream.CompletionHandlers {
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
      // TODO(jeremy): This code needs to be changed to properly send the complete document.
      // We should really change the Protos to use the RunMe Notebook and Cell protos
      // Then we can use RunMe's covnersion routines to generate those protos from the vscode data structurs.
      let doc = new doc_pb.Doc({
        blocks: [
          new doc_pb.Block({
            kind: doc_pb.BlockKind.MARKUP,
            contents: matchedCell.document.getText(),
          }),
        ],
      })

      let request = new agent_pb.StreamGenerateRequest({
        request: {
          case: 'fullContext',
          value: new agent_pb.FullContext({
            doc: doc,
            selected: matchedCell.index,
            notebookUri: notebook.uri.toString(),
          }),
        },
      })

      return request
    } else {
      // Generate an update request
      let request = new agent_pb.StreamGenerateRequest({
        request: {
          case: 'update',
          value: new agent_pb.BlockUpdate({
            blockId: 'block-1',
            blockContent: matchedCell.document.getText(),
          }),
        },
      })

      return request
    }
  }

  // processResponse applies the changes from the response to the notebook.
  processResponse(response: agent_pb.StreamGenerateResponse) {
    console.log('applyChanges called')
    // TODO(jeremy): How do we know which notebook and cell this response corresponds to?
    // Should we store that in the response?
    const newCellData: vscode.NotebookCellData[] = [
      {
        languageId: 'bash',
        kind: vscode.NotebookCellKind.Code,
        value: 'This is ghost text: input was:\n' + response.blocks[0].contents,
        metadata: {
          [ghostKey]: true,
        },
      },
    ]

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
      //renderGhostCell(vscode.window.activeNotebookEditor!)
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
class CellChangeEventGenerator {
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
