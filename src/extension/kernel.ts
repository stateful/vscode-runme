import EventEmitter from "node:events"
import vscode from "vscode"
import executor from './executors'

import "./wasm/wasm_exec.js"

export class Kernel implements vscode.Disposable {
  private inputHandler = new EventEmitter()
  private controller = vscode.notebooks.createNotebookController(
    "runme",
    "runme",
    "RUNME"
  )

  constructor() {
    this.controller.supportedLanguages = Object.keys(executor)
    this.controller.supportsExecutionOrder = false
    this.controller.description = "Run your README.md"
    this.controller.executeHandler = this._executeAll.bind(this)
  }

  dispose() { }

  emitInput (input: string) {
    this.inputHandler.emit('data', input)
  }

  private async _executeAll(cells: vscode.NotebookCell[]) {
    for (const cell of cells) {
      await this._doExecuteCell(cell)
    }
  }

  private async _doExecuteCell(cell: vscode.NotebookCell): Promise<void> {
    const runningCell = await vscode.workspace.openTextDocument(cell.document.uri)
    const exec = this.controller.createNotebookCellExecution(cell)

    exec.start(Date.now())
    const languageId = runningCell.languageId as keyof typeof executor
    const successfulCellExecution = await executor[languageId](exec, runningCell)
    exec.end(successfulCellExecution)
  }
}
