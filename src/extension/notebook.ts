import crypto from 'node:crypto'
import path from 'node:path'

import {
  NotebookSerializer, ExtensionContext, Uri, workspace, NotebookData, NotebookCellData, NotebookCellKind,
  window
} from 'vscode'

import type { WasmLib } from '../types'

import executor from './executors'
import Languages from './languages'
import { PLATFORM_OS, STATE_VERSION_KEY } from './constants'
import { normalizeLanguage } from './utils'
import type { DocumentVersionEntry } from './types'

declare var globalThis: any

// const CODE_REGEX = /```(\w+)?\n[^`]*```/g
const DEFAULT_LANG_ID = 'text'
const MAX_VERSION_COUNT = 20

export class Serializer implements NotebookSerializer {
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
        if (elem.type === 'code' && elem.source && !elem.executable) {
          const norm = Serializer.normalize(elem.source)
          return this.languages.guess(norm, PLATFORM_OS).then(guessed => {
            elem.executable = guessed
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
           * Keep original source code block to ensure indentation
           * and other formatting is kept as is
           */
          Serializer.normalize(elem.source || ''),
          /**
           * with custom vercel execution
           * lines.startsWith('vercel ') ? 'vercel' : s.executable
           */
          language || DEFAULT_LANG_ID
        )
        const attributes = elem.attributes
        const cliName = elem.name
        cell.metadata = {
          id: i,
          source: elem.source,
          executeableCode: lines.trim(),
          attributes,
          cliName,
          header: elem.source.split('\n')[0]
        }

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

  public async serializeNotebook(data: NotebookData): Promise<Uint8Array> {
    const newContent: string[] = []

    for (const cell of data.cells) {
      if (cell.kind === NotebookCellKind.Markup) {
        /**
         * for some reason the value of the markdown cell after the cell that
         * got edited contains the code header, e.g.:
         *
         *     value: "### Run image locally to make sure it works\n```sh { interactive=false }"
         *
         * This little tweak removes that.
         */
        const cellContentLines = cell.value.split('\n')
        const cellContent = cellContentLines[cellContentLines.length - 1].startsWith('```')
          ? cellContentLines.slice(0, -1).join('\n')
          : cell.value

        newContent.push(`${cellContent}\n`)
        continue
      }

      newContent.push(`${cell.metadata?.header}\n${cell.value}\n\`\`\`\n`)
    }

    const newMarkdownContent = newContent.join('\n')
    const newMarkdownContentHash = crypto.createHash('sha256').update(newMarkdownContent).digest('hex')
    const versionedDocuments = this.context.globalState.get<Record<string, DocumentVersionEntry[]>>(
      STATE_VERSION_KEY, {}
    )
    const currentDocumentPath = window.activeNotebookEditor?.notebook.uri.fsPath
    if (currentDocumentPath) {
      const documentVersions = versionedDocuments[currentDocumentPath] || []
      /**
       * no version has been stored so far, let's ensure we start with the original
       */
      if (documentVersions.length === 0) {
        const original = await workspace.fs.readFile(Uri.parse(currentDocumentPath))
        documentVersions.push({
          content: original.toString(),
          createdAt: Date.now(),
          hash: crypto.createHash('sha256').update(original.toString()).digest('hex')
        })
      }

      const hasSameVersion = Boolean(documentVersions.find((d) => d.hash === newMarkdownContentHash))
      /**
       * store a new version if non exists so far or if the current version
       * has new/different content
       */
      if (!hasSameVersion) {
        documentVersions.push({
          hash: newMarkdownContentHash,
          content: newMarkdownContent,
          createdAt: Date.now()
        })
        /**
         * only keep MAX_VERSION_COUNT amount of document versions around
         */
        versionedDocuments[currentDocumentPath] = documentVersions.slice(MAX_VERSION_COUNT * -1)
        await this.context.globalState.update(STATE_VERSION_KEY, versionedDocuments)
        console.log(
          `[Runme] a new version for file ${path.basename(currentDocumentPath)} with hash ${newMarkdownContentHash}`
        )
      }
    }

    return Promise.resolve(Buffer.from(newMarkdownContent))
  }

  #printCell(content: string, languageId = 'markdown') {
    return new NotebookData([
      new NotebookCellData(NotebookCellKind.Markup, content, languageId)
    ])
  }
}
