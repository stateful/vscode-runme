import fs from 'node:fs'
import vscode from 'vscode'

import type { ParsedReadmeEntry } from '../types'

declare var globalThis: any

const CODE_REGEX = /```(\w+)?\n[^`]*```/g

export class Serializer implements vscode.NotebookSerializer {
  private fileContent?: string
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
    const cells = snippets.reduce((acc, s, i) => {
      const lines = s.lines.join("\n")

      /**
       * code block description
       */
      if (s.description) {
        const cell = new vscode.NotebookCellData(
          vscode.NotebookCellKind.Markup,
          s.description,
          'markdown'
        )
        cell.metadata = { id: i }
        acc.push(cell)
      }

      const cell = new vscode.NotebookCellData(
        vscode.NotebookCellKind.Code,
        lines,
        /**
         * with custom vercel execution
         * lines.startsWith('vercel ') ? 'vercel' : s.executable
         */
        s.executable
      )
      cell.metadata = { id: i, source: lines }
      /**
       * code block
       */
      acc.push(cell)
      return acc
    }, [] as vscode.NotebookCellData[])
    return new vscode.NotebookData(cells)
  }

  public async serializeNotebook(
    data: vscode.NotebookData,
    // token: vscode.CancellationToken
  ): Promise<Uint8Array> {
    const markdownFile = vscode.window.activeTextEditor?.document.fileName
    if (!markdownFile) {
      throw new Error('Could not detect opened markdown document')
    }

    if (!this.fileContent) {
      this.fileContent = fs.readFileSync(markdownFile, 'utf-8').toString()
    }

    const codeExamples = this.fileContent.match(CODE_REGEX)

    for (const cell of data.cells) {
      const cellToReplace = codeExamples?.find((e) => e.includes(cell.metadata?.source))
      if (!cell.metadata || !cell.metadata.source || !cellToReplace) {
        continue
      }

      const exampleLines = cellToReplace.split('\n')
      const newContent = [
        exampleLines[0],
        cell.value,
        exampleLines[exampleLines.length - 1]
      ].join('\n')
      this.fileContent = this.fileContent.replace(cellToReplace, newContent)
    }

    return Promise.resolve(Buffer.from(this.fileContent))
  }
}
