import fs from 'node:fs'
import vscode from 'vscode'

import type { ParsedReadmeEntry } from '../types'

declare var globalThis: any

export class Serializer implements vscode.NotebookSerializer {
  private readonly ready: Promise<void>

  constructor(private context: vscode.ExtensionContext) {
    const go = new globalThis.Go()
    const wasmUri = vscode.Uri.joinPath(this.context.extensionUri, 'wasm', 'runme.wasm')
    this.ready = WebAssembly.instantiate(
      fs.readFileSync(wasmUri.path),
      go.importObject
    ).then(
      (result) => { go.run(result.instance) },
      (err: Error) => console.error(err)
    )
  }

  public async deserializeNotebook(content: Uint8Array): Promise<vscode.NotebookData> {
    await this.ready

    const md = content.toString()
    const snippets: ParsedReadmeEntry[] = globalThis.GetSnippets(md)
    const cells = snippets.reduce((acc, s) => {
      /**
       * code block description
       */
      if (s.description) {
        acc.push(
          new vscode.NotebookCellData(
            vscode.NotebookCellKind.Markup,
            s.description,
            'markdown'
          )
        )
      }
      /**
       * code block
       */
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
    // data: vscode.NotebookData,
    // token: vscode.CancellationToken
  ): Thenable<Uint8Array> {
    return Promise.resolve(new Uint8Array())
  }
}
