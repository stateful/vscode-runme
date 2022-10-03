import vscode, { ExtensionContext } from "vscode"
import executor from './executors'

import "./wasm/wasm_exec.js"

export class Kernel implements vscode.Disposable {
  #context: ExtensionContext
  private controller = vscode.notebooks.createNotebookController(
    "runme",
    "runme",
    "RUNME"
  )

  constructor(context: ExtensionContext) {
    this.#context = context

    this.controller.supportedLanguages = ['text', ...Object.keys(executor)]
    this.controller.supportsExecutionOrder = false
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
    const runningCell = await vscode.workspace.openTextDocument(cell.document.uri)
    const exec = this.controller.createNotebookCellExecution(cell)

    exec.start(Date.now())
    const languageId = await this.detectLang(cell)
    const successfulCellExecution = await executor[languageId](this.#context, exec, runningCell)
    exec.end(successfulCellExecution)
  }

  private async detectLang(cell: vscode.NotebookCell): Promise<keyof typeof executor> {
    const doc = await vscode.workspace.openTextDocument(cell.document.uri)
    const text = doc.getText()

    if (text.indexOf("vercel.com") > -1) {
      return "vercelApp"
    }
    else if (text.indexOf("vercel") > -1) {
      return "vercel"
    }

    return doc.languageId as keyof typeof executor
  }
}
