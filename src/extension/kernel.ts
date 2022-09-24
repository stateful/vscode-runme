import vscode from "vscode"
import executor from './executors'

import "./wasm/wasm_exec.js"

export class Kernel implements vscode.Disposable {
  private controller = vscode.notebooks.createNotebookController(
    "runme",
    "runme",
    "RUNME"
  )

  constructor() {
    this.controller.supportedLanguages = Object.keys(executor)
    this.controller.supportsExecutionOrder = true
    this.controller.description = "Run your README.md"
    this.controller.executeHandler = this._executeAll.bind(this)
  }
  dispose() { }

  private async _executeAll(cells: vscode.NotebookCell[]) {
    for (const cell of cells) {
      await this._doExecuteCell(cell)
    }
  }

  private async _doExecuteCell(cell: vscode.NotebookCell): Promise<void> {
    const doc = await vscode.workspace.openTextDocument(cell.document.uri)
    const exec = this.controller.createNotebookCellExecution(cell)

    exec.start(Date.now())
    const successfulCellExecution = await executor[doc.languageId as keyof typeof executor](exec, doc)
    exec.end(successfulCellExecution)
  }
}
