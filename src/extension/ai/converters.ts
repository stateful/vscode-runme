// Conversion routines between the protocol buffer format and VSCode's representation of a notebook
//
// See ../vscode_apis.md for an exlanation. It is very helpful for understanding this folder.

import * as vscode from 'vscode'
//import * as metadata from './metadata'
//import * as constants from './constants'
import {
  Notebook,
  Cell,
  CellKind,
  CellOutput,
  CellOutputItem,
} from '@buf/stateful_runme.community_timostamm-protobuf-ts/runme/parser/v1/parser_pb'

export { Serializer } from '../serializer'

// cellToCellData converts a NotebookCell to a NotebookCellData.
// NotebookCell is an interface used by the editor.
// NotebookCellData is a concrete class.
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

// cellDataToProto converts an instance of NotebookCellData to the proto.
export function cellDataToProto(cell: vscode.NotebookCellData): Cell {
  let cellPb = Cell.create()
  cellPb.value = cell.value
  cellPb.languageId = cell.languageId
  if (cell.kind === vscode.NotebookCellKind.Code) {
    cellPb.kind = CellKind.CODE
  } else {
    cellPb.kind = CellKind.MARKUP
  }

  // TODO(jeremy):  cell.metadata is type map[string]Any; cellPb.metadata is type map[string]string
  // How do we handle the conversion?
  //cellPb.metadata = cell.metadata

  let cellOutputs: vscode.NotebookCellOutput[] = []
  if (cell.outputs !== undefined) {
    cellOutputs = cell.outputs
  }
  for (const output of cellOutputs) {
    let out = CellOutput.create()
    out.items = []
    for (const item of output.items) {
      let outItem = CellOutputItem.create()
      outItem.data = item.data
      outItem.mime = item.mime
      out.items.push(outItem)
    }
    cellPb.outputs.push(out)
  }
  return cellPb
}

// protoToCellData converts a cell proto to a NotebookCellData.
export function protoToCellData(cellPb: Cell): vscode.NotebookCellData {
  let kind = vscode.NotebookCellKind.Markup
  if (cellPb.kind === CellKind.CODE) {
    kind = vscode.NotebookCellKind.Code
  }

  let newCell = new vscode.NotebookCellData(kind, cellPb.value, cellPb.languageId)

  newCell.metadata = cellPb.metadata
  newCell.outputs = []
  for (let output of cellPb.outputs) {
    let items: vscode.NotebookCellOutputItem[] = []
    for (let item of output.items) {
      items.push(new vscode.NotebookCellOutputItem(item.data, item.mime))
    }
    newCell.outputs.push(new vscode.NotebookCellOutput(items))
  }
  return newCell
}
