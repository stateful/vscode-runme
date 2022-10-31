import fs from 'node:fs'
// import fsp from 'node:fs/promises'

import vscode from 'vscode'

import type { ParsedDocument } from '../types'

import executor from './executors'
import Languages from './languages'
import { PLATFORM_OS } from './constants'

declare var globalThis: any

// const CODE_REGEX = /```(\w+)?\n[^`]*```/g
const DEFAULT_LANG_ID = 'text'
const LANGUAGES_WITH_INDENTATION = ['html', 'tsx', 'ts', 'js']

export class Serializer implements vscode.NotebookSerializer {
  private fileContent?: string
  private readonly ready: Promise<Error | void>
  private readonly languages = Languages.fromContext(this.context)

  constructor(private context: vscode.ExtensionContext) {
    const go = new globalThis.Go()
    const wasmUri = vscode.Uri.joinPath(this.context.extensionUri, 'wasm', 'runme.wasm')
    this.ready = WebAssembly.instantiate(
      fs.readFileSync(wasmUri.fsPath),
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
        (err ? `\n<small>${err.message}</small>` : '') +
        '.<p>Please report bug at https://github.com/stateful/vscode-runme/issues' +
        ' or let us know on Discord (https://discord.gg/BQm8zRCBUY)</p>'
      )
    }

    let snippets = doc.document ?? []
    if (snippets.length === 0) {
      return this.#printCell('⚠️ __Error__: no cells found!')
    }

    try {
      snippets = await Promise.all(snippets.map(s => {
        const content = s.content
        if (content && s.language === undefined) {
          return this.languages.guess(content, PLATFORM_OS).then(guessed => {
            s.language = guessed
            return s
          })
        }
        return Promise.resolve(s)
      }))
    } catch (err: any) {
      console.error(`Error guessing snippet languages: ${err}`)
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

      const isSupported = Object.keys(executor).includes(s.language || '')
      if (s.lines && isSupported) {
        const lines = s.lines.join('\n')
        const language = s.language === 'shell' ? 'sh' : s.language
        const cell = new vscode.NotebookCellData(
          vscode.NotebookCellKind.Code,
          /**
           * for JS content we want to keep indentation
           */
           LANGUAGES_WITH_INDENTATION.includes(s.language || '')
            ? (s.content || '').trim()
            : lines.trim(),
          /**
           * with custom vercel execution
           * lines.startsWith('vercel ') ? 'vercel' : s.executable
           */
          language || DEFAULT_LANG_ID
        )
        const attributes = s.attributes
        const cliName = s.name
        cell.metadata = { id: i, source: lines, attributes, cliName }
        /**
         * code block
         */
        acc.push(cell)
      } else if (s.language) {
        const mdContent = s.content ?? (s.lines || []).join('\n').trim()
        const cell = new vscode.NotebookCellData(
          vscode.NotebookCellKind.Markup,
          `\`\`\`${s.language}\n${mdContent}\n\`\`\``,
          'markdown'
        )
        cell.metadata = { id: i }
        acc.push(cell)
      }
      return acc
    }, [] as vscode.NotebookCellData[])
    return new vscode.NotebookData(cells)
  }

  public async serializeNotebook(
    // data: vscode.NotebookData,
    // token: vscode.CancellationToken
  ): Promise<Uint8Array> {
    // eslint-disable-next-line max-len
    throw new Error('Notebooks are currently read-only. Please edit markdown in file-mode (right click: "Open With...") instead.')
    //
    // Below's impl is highly experimental and will leads unpredictable results
    // including data loss
    //
    // const markdownFile = vscode.window.activeTextEditor?.document.fileName
    // if (!markdownFile) {
    //   throw new Error('Could not detect opened markdown document')
    // }

    // const fileExist = await fsp.access(markdownFile).then(() => true, () => false)
    // if (!fileExist) {
    //   return new Uint8Array()
    // }

    // if (!this.fileContent && fileExist) {
    //   this.fileContent = (await fsp.readFile(markdownFile, 'utf-8')).toString()
    // }

    // if (!this.fileContent) {
    //   return new Uint8Array()
    // }

    // const codeExamples = this.fileContent.match(CODE_REGEX)

    // for (const cell of data.cells) {
    //   const cellToReplace = codeExamples?.find((e) => e.includes(cell.metadata?.source))
    //   if (!cell.metadata || !cell.metadata.source || !cellToReplace) {
    //     continue
    //   }

    //   const exampleLines = cellToReplace.split('\n')
    //   const newContent = [
    //     exampleLines[0],
    //     cell.value,
    //     exampleLines[exampleLines.length - 1]
    //   ].join('\n')
    //   this.fileContent = this.fileContent.replace(cellToReplace, newContent)
    // }

    // return Promise.resolve(Buffer.from(this.fileContent))
  }

  #printCell (content: string, languageId = 'markdown') {
    return new vscode.NotebookData([
      new vscode.NotebookCellData(vscode.NotebookCellKind.Markup, content, languageId)
    ])
  }
}
