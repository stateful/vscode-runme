import EventEmitter from "node:events"
import vscode from "vscode"
import executor from './executors'

import "./wasm/wasm_exec.js"

export class Kernel implements vscode.Disposable {
  private runningCell?: vscode.TextDocument
  private inputHandler = new EventEmitter()
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

  get runningCellCommand () {
    return this.runningCell?.getText()
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
    this.runningCell = await vscode.workspace.openTextDocument(cell.document.uri)
    const exec = this.controller.createNotebookCellExecution(cell)

    exec.start(Date.now())
    const successfulCellExecution = await executor[this.runningCell.languageId as keyof typeof executor](
      exec,
      this.runningCell,
      this.inputHandler
    )
    exec.end(successfulCellExecution)
  }
}
