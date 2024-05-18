// Conversion routines between the protocol buffer format and VSCode's representation of a notebook
//
// See ../vscode_apis.md for an exlanation. It is very helpful for understanding this folder.

import * as vscode from 'vscode'

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
