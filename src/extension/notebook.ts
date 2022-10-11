import fs from 'node:fs'
import fsp from 'node:fs/promises'

import vscode from 'vscode'
import { ModelOperations } from '@vscode/vscode-languagedetection'

import type { ParsedDocument } from '../types'


declare var globalThis: any

const CODE_REGEX = /```(\w+)?\n[^`]*```/g
const DEFAULT_LANG_ID = 'text'

export class Serializer implements vscode.NotebookSerializer {
  private static NODE_MODEL_JSON_FUNC = (context: vscode.ExtensionContext): () => Promise<{ [key: string]: any }> => {
    return async () => {
      return new Promise<any>((resolve, reject) => {
        fs.readFile(vscode.Uri.joinPath(context.extensionUri, 'model', 'model.json').path, (err, data) => {
          if (err) {
            reject(err)
            return
          }
          resolve(JSON.parse(data.toString()))
        })
      })
    }
  }

  private static NODE_WEIGHTS_FUNC = (context: vscode.ExtensionContext): () => Promise<ArrayBuffer> => {
    return async () => {
      return new Promise<ArrayBuffer>((resolve, reject) => {
        fs.readFile(vscode.Uri.joinPath(context.extensionUri, 'model', 'group1-shard1of1.bin').path, (err, data) => {
          if (err) {
            reject(err)
            return
          }
          resolve(data.buffer)
        })
      })
    }
  }

  private fileContent?: string
  private readonly ready: Promise<Error | void>
  private readonly modulOperations = new ModelOperations({
    minContentSize: 10,
    modelJsonLoaderFunc: Serializer.NODE_MODEL_JSON_FUNC(this.context),
    weightsLoaderFunc: Serializer.NODE_WEIGHTS_FUNC(this.context),
  })

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

    let snippets = doc.document ?? []
    if (snippets.length === 0) {
      return this.#printCell('⚠️ __Error__: no cells found!')
    }

    try {
      snippets = await Promise.all(snippets.map(s => {
        const content = s.content
        if (content) {
          return this.modulOperations.runModel(content).then(l => {
            // todo(sebastian): weigh winners
            const winner = l[0]?.languageId
            s.language = winner
            return s
          })
        }
        return Promise.resolve(s)
      }))
    } catch (err: any) {
      console.error(`Error classifying snippets: ${err}`)
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

      if (s.lines) {
        const lines = s.lines.join('\n')
        const cell = new vscode.NotebookCellData(
          vscode.NotebookCellKind.Code,
          lines.trim(),
          /**
           * with custom vercel execution
           * lines.startsWith('vercel ') ? 'vercel' : s.executable
           */
          s.language || DEFAULT_LANG_ID
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
