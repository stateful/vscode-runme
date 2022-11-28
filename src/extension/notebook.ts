import {
  NotebookSerializer, ExtensionContext, Uri, workspace, NotebookData, NotebookCellData, NotebookCellKind
} from 'vscode'

import type { WasmLib } from '../types'

import executor from './executors'
import Languages from './languages'
import { PLATFORM_OS } from './constants'
import { normalizeLanguage } from './utils'

declare var globalThis: any

// const CODE_REGEX = /```(\w+)?\n[^`]*```/g
const ALPHA_NUM_REGEX = /^[a-z0-9]+$/i
const DEFAULT_LANG_ID = 'text'
const LANGUAGES_WITH_INDENTATION = ['html', 'tsx', 'ts', 'js']

export class Serializer implements NotebookSerializer {
  private fileContent?: string
  private readonly ready: Promise<Error | void>
  private readonly languages: Languages

  constructor(private context: ExtensionContext) {
    this.languages = Languages.fromContext(this.context)
    this.ready = this.#initWasm()
  }

  async #initWasm() {
    const go = new globalThis.Go()
    const wasmUri = Uri.joinPath(this.context.extensionUri, 'wasm', 'runme.wasm')
    const wasmFile = await workspace.fs.readFile(wasmUri)
    return WebAssembly.instantiate(wasmFile, go.importObject).then(
      (result) => { go.run(result.instance) },
      (err: Error) => {
        console.error(`[Runme] failed initialising WASM file: ${err.message}`)
        return err
      }
    )
  }

  public async deserializeNotebook(content: Uint8Array): Promise<NotebookData> {
    const err = await this.ready

    const md = content.toString()
    const { Runme } = globalThis as WasmLib.Runme

    Runme.initialize(md)
    const res = Runme.getCells() as WasmLib.Cells

    if (!res || err) {
      return this.#printCell(
        '⚠️ __Error__: document could not be loaded' +
        (err ? `\n<small>${err.message}</small>` : '') +
        '.<p>Please report bug at https://github.com/stateful/vscode-runme/issues' +
        ' or let us know on Discord (https://discord.gg/BQm8zRCBUY)</p>'
      )
    }

    let parsedCells = res.cells ?? []
    if (parsedCells.length === 0) {
      return this.#printCell('⚠️ __Error__: no cells found!')
    }

    try {
      parsedCells = await Promise.all(parsedCells.map(elem => {
        if (
          elem.type === 'code' &&
          elem.source &&
          // if attributes are being used but no lang designator
          (!elem.executable || !elem.executable.match(ALPHA_NUM_REGEX))
        ) {
          const norm = Serializer.normalize(elem.source)
          return this.languages.guess(norm, PLATFORM_OS).then((guessed) => {
            elem.executable = guessed
            elem.attributes = {
              ...elem.attributes,
              ...{ executable: guessed },
            }
            return elem
          })
        }
        return Promise.resolve(elem)
      }))
    } catch (err: any) {
      console.error(`Error guessing snippet languages: ${err}`)
    }

    const cells = parsedCells.reduce((acc, elem, i) => {
      /**
       * code block description
       */
      if (elem.type === 'markdown') {
        const cell = new NotebookCellData(
          NotebookCellKind.Markup,
          elem.source,
          'markdown'
        )
        cell.metadata = { id: i }
        acc.push(cell)
        return acc
      }

      const isSupported = Object.keys(executor).includes(elem.executable ?? '')
      if (elem.lines && isSupported && elem.editable) {
        const lines = elem.lines.join('\n')
        const language = normalizeLanguage(elem.executable)
        const cell = new NotebookCellData(
          NotebookCellKind.Code,
          /**
           * for JS content we want to keep indentation
           */
          LANGUAGES_WITH_INDENTATION.includes(language || '')
            ? (Serializer.normalize(elem.source || '')).trim()
            : lines.trim(),
          /**
           * with custom vercel execution
           * lines.startsWith('vercel ') ? 'vercel' : s.executable
           */
          language || DEFAULT_LANG_ID
        )
        const attributes = elem.attributes
        const cliName = elem.name
        cell.metadata = { id: i, source: lines, attributes, cliName }
        /**
         * code block
         */
        acc.push(cell)
      } else if (elem.source) {
        const cell = new NotebookCellData(
          NotebookCellKind.Markup,
          elem.source,
          'markdown'
        )
        cell.metadata = { id: i }
        acc.push(cell)
      }
      return acc
    }, [] as NotebookCellData[])
    return new NotebookData(cells)
  }

  public static normalize(source: string): string {
    const lines = source.split('\n')
    const normed = lines.filter(l => !(l.trim().startsWith('```') || l.trim().endsWith('```')))
    return normed.join('\n')
  }

  public async serializeNotebook(
    // data: NotebookData,
    // token: CancellationToken
  ): Promise<Uint8Array> {
    // eslint-disable-next-line max-len
    throw new Error('Notebooks are currently read-only. Please edit markdown in file-mode (right click: "Open With...") instead.')
    //
    // Below's impl is highly experimental and will leads unpredictable results
    // including data loss
    //
    // const markdownFile = window.activeTextEditor?.document.fileName
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

  #printCell(content: string, languageId = 'markdown') {
    return new NotebookData([
      new NotebookCellData(NotebookCellKind.Markup, content, languageId)
    ])
  }
}
