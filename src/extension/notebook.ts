import fs from 'node:fs'
import fsp from 'node:fs/promises'

import vscode from 'vscode'

import type { ParsedDocument } from '../types'

declare var globalThis: any

const CODE_REGEX = /```(\w+)?\n[^`]*```/g

export class Serializer implements vscode.NotebookSerializer {
  private fileContent?: string
  private readonly ready: Promise<Error | void>

  constructor(private context: vscode.ExtensionContext) {
    const go = new globalThis.Go()
    const wasmUri = vscode.Uri.joinPath(this.context.extensionUri, 'wasm', 'runme.wasm')
    this.ready = WebAssembly.instantiate(
      fs.readFileSync(wasmUri.path),
      go.importObject
    ).then(
      (result) => { go.run(result.instance) },
      (err: Error) => {
        console.error(err)
        return err
      }
    )
  }

  public async deserializeNotebook(content: Uint8Array): Promise<vscode.NotebookData> {
    const err = await this.ready

    const md = content.toString()
    const doc = globalThis.GetDocument(md) as ParsedDocument

    if (!doc || err) {
      return this.#printCell(
        '⚠️ __Error__: document could not be loaded' +
        (err ? `\n<small>${err.message}</small>` : '')
      )
    }

    const snippets = doc.document ?? []
    if (snippets.length === 0) {
      return this.#printCell('⚠️ __Error__: no cells found!')
    }

    const cells = snippets.reduce((acc, s, i) => {
      /**
       * code block description
       */
      if (s.markdown) {
        const cell = new vscode.NotebookCellData(
          vscode.NotebookCellKind.Markup,
          s.markdown,
          'markdown'
        )
        cell.metadata = { id: i }
        acc.push(cell)
      }

      if (s.content) {
        const lines = s.content.toString()
        const cell = new vscode.NotebookCellData(
          vscode.NotebookCellKind.Code,
          lines,
          /**
           * with custom vercel execution
           * lines.startsWith('vercel ') ? 'vercel' : s.executable
           */
          s.language || "text"
        )
        const attributes = s.attributes
        cell.metadata = { id: i, source: lines, attributes }
        /**
         * code block
         */
        acc.push(cell)
      }
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

    const fileExist = await fsp.access(markdownFile).then(() => true, () => false)
    if (!fileExist) {
      return new Uint8Array()
    }

    if (!this.fileContent && fileExist) {
      this.fileContent = (await fsp.readFile(markdownFile, 'utf-8')).toString()
    }

    if (!this.fileContent) {
      return new Uint8Array()
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

  #printCell (content: string, languageId = 'markdown') {
    return new vscode.NotebookData([
      new vscode.NotebookCellData(vscode.NotebookCellKind.Markup, content, languageId)
    ])
  }
}
