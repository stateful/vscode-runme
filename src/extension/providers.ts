import { readFileSync } from "node:fs"

import vscode from "vscode"
import executor from './executors'
import type { ParsedReadmeEntry } from './types'

import "./wasm/wasm_exec.js"

declare var globalThis: any

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

export class Serializer implements vscode.NotebookSerializer {
  private readonly ready: Promise<void>

  constructor(private context: vscode.ExtensionContext) {
    const go = new globalThis.Go()
    const wasmUri = vscode.Uri.joinPath(this.context.extensionUri, 'wasm', 'runme.wasm')
    this.ready = WebAssembly.instantiate(
      readFileSync(wasmUri.path),
      go.importObject
    ).then(
      (result) => { go.run(result.instance) },
      (err: Error) => console.error(err)
    )
  }

  public async deserializeNotebook(
    content: Uint8Array,
    token: vscode.CancellationToken
  ): Promise<vscode.NotebookData> {
    await this.ready

    const md = content.toString()
    const snippets: ParsedReadmeEntry[] = globalThis.GetSnippets(md)
    const cells = snippets.reduce((acc, s) => {
      acc.push(
        new vscode.NotebookCellData(
          vscode.NotebookCellKind.Markup,
          s.description,
          s.executable
        )
      )
      acc.push(
        new vscode.NotebookCellData(
          vscode.NotebookCellKind.Code,
          s.lines.join("\n"),
          s.executable
        )
      )
      return acc
    }, [] as vscode.NotebookCellData[])
    return new vscode.NotebookData(cells)
  }

  public serializeNotebook(
    data: vscode.NotebookData,
    token: vscode.CancellationToken
  ): Thenable<Uint8Array> {
    return Promise.resolve(new Uint8Array())
  }
}

export class ThumbsUpProvider
  implements vscode.NotebookCellStatusBarItemProvider {
  provideCellStatusBarItems(
    cell: vscode.NotebookCell
  ): vscode.NotebookCellStatusBarItem | undefined {
    const ran = <boolean | undefined>cell.outputs[0]?.metadata?.["ran"]
    if (typeof ran !== "boolean" || ran === false) {
      return
    }
    const item = new vscode.NotebookCellStatusBarItem(
      `👍`,
      vscode.NotebookCellStatusBarAlignment.Right
    )
    item.command = "marquee.open"
    item.tooltip = `This worked great`
    return item
  }
}

export class ThumbsDownProvider
  implements vscode.NotebookCellStatusBarItemProvider {
  provideCellStatusBarItems(
    cell: vscode.NotebookCell
  ): vscode.NotebookCellStatusBarItem | undefined {
    const ran = <boolean | undefined>cell.outputs[0]?.metadata?.["ran"]
    if (typeof ran !== "boolean" || ran === false) {
      return
    }
    const item = new vscode.NotebookCellStatusBarItem(
      `👎`,
      vscode.NotebookCellStatusBarAlignment.Right
    )
    item.command = "marquee.open"
    item.tooltip = `Didn't work`
    return item
  }
}
