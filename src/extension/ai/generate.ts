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
import * as serializer from '../serializer'

import { Serializer } from '../types'
import getLogger from '../logger'
const log = getLogger('AIGenerate')

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
  log.trace(`generateCompletion: lastSelectedCell: ${lastSelectedCell}`)

  // Notebook uses the vscode interface types NotebookDocument and NotebookCell. We
  // need to convert this to NotebookCellData which is the concrete type used by the serializer.
  // This allows us to reuse the existing serializer code.
  let cellData = editor?.notebook.getCells().map((cell) => converters.cellToCellData(cell))
  let notebookData = new vscode.NotebookData(cellData)

  let notebookProto = serializer.GrpcSerializer.marshalNotebook(notebookData)

  const req = GenerateCellsRequest.create()
  req.notebook = notebookProto

  let client = initAIServiceClient()

  client
    .generateCells(req)
    .then((finished) => {
      let response = finished.response
      // TODO(jeremy): We should have the server add the traceId to the response and then we should
      // log it here. This is for debugging purposes as it allows to easily link to the logs
      log.info('Generate request succeeded traceId')

      const insertCells = addAIGeneratedCells(lastSelectedCell + 1, response)

      const edit = new vscode.WorkspaceEdit()
      const notebookUri = editor?.notebook.uri
      edit.set(notebookUri, [insertCells])
      vscode.workspace.applyEdit(edit).then((result: boolean) => {
        log.trace(`applyedit resolved with ${result}`)
      })
    })
    .catch((error) => {
      log.error(`AI Generate request failed ${error}`)
      return
    })
}

// addAIGeneratedCells turns the response from the AI model into a set of cells that can be inserted into the notebook.
// This is done by returning a mutation to add the new cells to the notebook.
// index is the position in the notebook at which the new the new cells should be inserted.
function addAIGeneratedCells(index: number, response: GenerateCellsResponse): vscode.NotebookEdit {
  let notebook = new Serializer.Notebook()
  notebook.cells = response.cells
  let newCellData = serializer.SerializerBase.revive(notebook)
  // Now insert the new cells at the end of the notebook
  return vscode.NotebookEdit.insertCells(index, newCellData)
}
