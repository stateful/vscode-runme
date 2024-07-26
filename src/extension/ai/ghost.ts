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
  // onDidChangeTextDocument fires when the contents of a cell changes.
  // We use this to generate completions.
  // context.subscriptions.push(
  //   vscode.workspace.onDidChangeTextDocument(handleOnDidChangeNotebookCell),
  // )

  // TODO(jeremy): How would we use the removeEventHandler to make sure the observable is disposed of
  // when the extension is deactivated?
  const textDocumentEvents = fromEventPattern<vscode.TextDocumentChangeEvent>(
    createRegisterOnDidChangeTextDocumentHandler(context),
  )

  let cellGenerator = new GhostCellGenerator()

  // Create a stream creator. The StreamCreator is a class that effectively windows events
  // and turns each window into an AsyncIterable of streaming requests.
  let creator = new stream.StreamCreator(cellGenerator.handleGenerateResponses)

  let finalResult = textDocumentEvents.pipe(
    rxjs.map((event) => cellGenerator.textDocumentChangeEventToCompletionRequest(event)),
    rxjs.filter((request) => request !== null),
    rxjs.map((request) => creator.handleEvent(request)),
    rxjs.finalize(() => {
      console.log('TextDocumentEvents Stream completed, cleaning up StreamCreator')
      creator.shutdown()
    }),
  )

  // TODO(jeremy): If we don't subscribe no events will get processed.
  // What should the subscription actually do? Nothing?
  finalResult.subscribe({
    next: (result) => {
      log.info(`final result: ${result}`)
    },
    error: (err) => {
      log.error(`Error: ${err}`)
    },
    complete: () => {
      log.info('complete')
    },
  })

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
function createRegisterOnDidChangeTextDocumentHandler(
  context: vscode.ExtensionContext,
): (observableHandler: (event: vscode.TextDocumentChangeEvent) => void) => void {
  // registerOnDidChangeTextDocumentHandler will be used to register the observable handler
  // for the onDidChangeTextDocument event. This function will be invoked by the observable
  // handler when a subscription is created. The argument, observableHandler, will be
  // a function that will add the events to the observable.
  return function registerOnDidChangeTextDocumentHandler(
    observableHandler: (event: vscode.TextDocumentChangeEvent) => void,
  ) {
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(observableHandler))
  }
}

// GhostCellGenerator is a class that generates completions for a notebook cell.
// It contains a bunch of functions that can process events and responses.
// Its a class because these transformations are stateful. For example,
// We get a VSCode TextDocumentChangeEvent telling us that a cell has changed. Based on this
// we create completion requests to the AIService. In order to handle the response we need to
// know where in the notebook the new cells should be inserted. So we store that as state
// in the class.
// TODO(jeremy): Multiple notebooks could be processed simulatenously. How do we handle that?
// Where should we store per notebook state?
// How would we unload that state? Track notebook open/close envents
class GhostCellGenerator {
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
  textDocumentChangeEventToCompletionRequest(
    event: vscode.TextDocumentChangeEvent,
  ): agent_pb.StreamGenerateRequest | null {
    if (event.document.uri.scheme !== 'vscode-notebook-cell') {
      // ignore other open events
      return null
    }
    var matchedCell: vscode.NotebookCell | undefined

    // TODO(jeremy): Is there a more efficient way to find the cell and notebook?
    // Can we cache it in the class? Since we keep track of notebooks in NotebookState
    // Is there a way we can go from the URI of the cell to the URI of the notebook directly
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
      return null
    }

    // Get the notebook state; this will initialize it if this is the first time we
    // process an event for this notebook.
    let nbState = this.getNotebookState(notebook)

    if (matchedCell === undefined) {
      log.error(`cell for document ${event.document.uri} NOT found`)
      return null
    }

    // Decide whether
    let newCell = true
    if (nbState.activeCell?.document.uri === matchedCell?.document.uri) {
      newCell = false
    }

    log.info(
      `onDidChangeTextDocument Fired for notebook ${event.document.uri}; reason ${event.reason} ` +
        'this should fire when a cell is added to a notebook',
    )
    log.info(`onDidChangeTextDocument: latest contents ${event.document.getText()}`)

    // Update notebook state
    nbState.activeCell = matchedCell
    this.notebookState.set(notebook.uri, nbState)

    if (newCell) {
      // Generate a new request
      // TODO(jeremy): This code needs to be changed to properly send the complete document.
      // We should really change the Protos to use the RunMe Notebook and Cell protos
      // Then we can use RunMe's covnersion routines to generate those protos from the vscode data structurs.
      let doc = new doc_pb.Doc({
        blocks: [
          new doc_pb.Block({
            kind: doc_pb.BlockKind.MARKUP,
            contents: event.document.getText(),
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
            blockContent: event.document.getText(),
          }),
        },
      })

      return request
    }
  }

  // handleGenerateResponses is called by the streamCreator to handle the responses from the AIService.
  // i.e.  handleInitiateChanges(client.streamGenerate(iterable))
  // Use arrow function to make sure this gets bound
  handleGenerateResponses = async (responses: AsyncIterable<agent_pb.StreamGenerateResponse>) => {
    console.log('handleGenerateResponses called')
    for await (const response of responses) {
      this.applyChanges(response)
    }
  }

  // applyChanges applies the changes from the response to the notebook.
  applyChanges(response: agent_pb.StreamGenerateResponse) {
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
}

// NotebookState keeps track of state information for a given notebook.
class NotebookState {
  public activeCell: vscode.NotebookCell | null
  constructor() {
    this.activeCell = null
  }
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
