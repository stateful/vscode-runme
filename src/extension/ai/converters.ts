// Conversion routines between the protocol buffer format and VSCode's representation of a notebook
//
// See ../vscode_apis.md for an exlanation. It is very helpful for understanding this folder.

import * as vscode from 'vscode'
import * as parser_pb from '@buf/stateful_runme.bufbuild_es/runme/parser/v1/parser_pb'

import { ServerLifecycleIdentity, getServerConfigurationValue } from '../../utils/configuration'
import { Serializer } from '../../types'
import * as serializerTypes from '../grpc/serializerTypes'
import * as serializer from '../serializer'

// cellToCellData converts a NotebookCell to a NotebookCellData.
// NotebookCell is an interface used by the editor.
// NotebookCellData is a concrete class.
// For more explanation of the different vscode APIs see
// https://github.com/jlewi/foyle/blob/main/frontend/foyle/vscode_apis.md
export function cellToCellData(cell: vscode.NotebookCell): vscode.NotebookCellData {
  let data = new vscode.NotebookCellData(
    cell.kind,
    cell.document.getText(),
    cell.document.languageId,
  )

  data.metadata = cell.metadata
  data.outputs = []
  for (let o of cell.outputs) {
    data.outputs.push(o)
  }
  return data
}

// cellProtosToCellData converts an array of RunMe cell protos to an array of VSCode CellData
export function cellProtosToCellData(cells: serializerTypes.Cell[]): vscode.NotebookCellData[] {
  let notebook: Serializer.Notebook = {
    cells: [],
  }
  for (let cell of cells) {
    let kind: vscode.NotebookCellKind = vscode.NotebookCellKind.Markup

    if (cell.kind === serializerTypes.CellKind.CODE) {
      kind = vscode.NotebookCellKind.Code
    }

    let newCell: Serializer.Cell = {
      value: cell.value,
      metadata: cell.metadata,
      kind: kind,
      languageId: cell.languageId,
      // TODO(jeremy): Should we include outputs? The generate response should never contain outputs so we shouldn't
      // have to worry about them.
    }
    notebook.cells.push(newCell)
  }

  const identity: ServerLifecycleIdentity = getServerConfigurationValue<ServerLifecycleIdentity>(
    'lifecycleIdentity',
    serializerTypes.RunmeIdentity.ALL,
  )
  let newCellData = serializer.SerializerBase.revive(notebook, identity)
  return newCellData
}

// vsCellsToESProto converts a VSCode NotebookCell to a RunMe Cell proto
// Its not quite the inverse of cellProtosToCellData because this function
// uses the ES client library as opposed to the TS client library.
// The reason we don't rely on the serialization routines is we don't want to
// generate an RPC just to convert the cell to a proto.
export function vsCellToESProto(cell: vscode.NotebookCell): parser_pb.Cell {
  const cellProto = new parser_pb.Cell()
  if (cell.kind === vscode.NotebookCellKind.Code) {
    cellProto.kind = parser_pb.CellKind.CODE
  } else if (cell.kind === vscode.NotebookCellKind.Markup) {
    cellProto.kind = parser_pb.CellKind.MARKUP
  }

  cellProto.value = cell.document.getText()
  cellProto.metadata = cell.metadata
  return cellProto
}
