import * as vscode from 'vscode'
// import {FoyleClient, getTraceID} from './client';
// import * as converters from './converters';
// generateCompletion generates a completion by calling the foyle backend and then adds
// the returned blocks to the window
import {
  GenerateCellsRequest,
  GenerateCellsResponse,
} from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/ai/v1alpha1/ai_pb'
import {
  Notebook,
  Cell,
} from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/parser/v1/parser_pb'

import { initAIServiceClient } from './client'
import * as converters from './converters'

export async function generateCompletion() {
  const editor = vscode.window.activeNotebookEditor

  if (!editor) {
    return
  }

  if (editor?.selection.isEmpty) {
    return
  }

  // We subtract 1 because end is non-inclusive
  const lastSelectedCell = editor?.selection.end - 1
  var lastActiveCell = editor?.notebook.cellAt(lastSelectedCell)
  console.log('Getting cells')
  let cells = editor?.notebook.getCells(new vscode.NotebookRange(0, editor?.notebook.cellCount))
  console.log('Got cells')

  const req = GenerateCellsRequest.create()
  req.notebook = Notebook.create()
  req.notebook.cells = []
  for (let cell of cells) {
    let cellPb = converters.cellDataToProto(converters.cellToCellData(cell))
    req.notebook.cells.push(cellPb)
  }

  let client = initAIServiceClient()

  client
    .generateCells(req)
    .then((finished) => {
      let response = finished.response
      // TODO(jeremy): We should have the server add the traceId to the response and then we should
      // log it here. This is for debugging purposes as it allows to easily link to the logs
      //console.log(`Generate request succeeded traceId: ${traceId}`)

      // To add the traceId to the input data we need to create a mutation
      //const traceIdEdit = createAddTraceIDMutation(lastActiveCell, traceId)

      const insertCells = addAIGeneratedCells(lastSelectedCell + 1, response)

      const edit = new vscode.WorkspaceEdit()
      const notebookUri = editor?.notebook.uri
      edit.set(notebookUri, [insertCells])
      vscode.workspace.applyEdit(edit).then((result: boolean) => {
        console.log(`applyedit resolved with ${result}`)
      })
    })
    .catch((error) => {
      console.error(`Generate request failed ${error}`)
      return
    })
}

// addAIGeneratedCells turns the response from the AI model into a set of cells that can be inserted into the notebook.
// This is done by returning a mutation to add the new cells to the notebook.
// index is the position in the notebook at which the new the new cells should be inserted.
function addAIGeneratedCells(index: number, response: GenerateCellsResponse): vscode.NotebookEdit {
  let newCellData: vscode.NotebookCellData[] = []

  for (let newCell of response.cells) {
    const data = converters.protoToCellData(newCell)
    newCellData.push(data)
  }

  // Now insert the new cells at the end of the notebook
  return vscode.NotebookEdit.insertCells(index, newCellData)
}
