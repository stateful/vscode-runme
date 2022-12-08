/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  NotebookSerializer,
  ExtensionContext,
  Uri,
  workspace,
  NotebookData,
  NotebookCellData,
  NotebookCellKind,
  CancellationToken,
} from 'vscode'

import { WasmLib } from '../types'

import executor from './executors'
import Languages from './languages'
import { PLATFORM_OS } from './constants'
import { Serializer as OldSerializer, DEFAULT_LANG_ID } from './notebook'

declare var globalThis: any

export class Serializer implements NotebookSerializer {
  private readonly wasmReady: Promise<Error | void>
  private readonly languages: Languages

  constructor(private context: ExtensionContext) {
    this.languages = Languages.fromContext(this.context)
    this.wasmReady = this.#initWasm()
  }

  async #initWasm() {
    const go = new globalThis.Go()
    const wasmUri = Uri.joinPath(
      this.context.extensionUri,
      'wasm',
      'runme.wasm'
    )
    const wasmFile = await workspace.fs.readFile(wasmUri)
    return WebAssembly.instantiate(wasmFile, go.importObject).then(
      (result) => {
        go.run(result.instance)
      },
      (err: Error) => {
        console.error(`[Runme] failed initializing WASM file: ${err.message}`)
        return err
      }
    )
  }

  public async serializeNotebook(
    data: NotebookData,
    token: CancellationToken
  ): Promise<Uint8Array> {
    console.log(new Date(), 'serializeNotebook')
    try {
      const err = await this.wasmReady
      if (err) {
        throw err
      }

      const { Runme } = globalThis as WasmLib.New.Serializer

      const notebook = JSON.stringify(data)
      const markdown = await Runme.serialize(notebook)

      const encoder = new TextEncoder()
      const encoded = encoder.encode(markdown)

      return encoded
    } catch (err: any) {
      console.error(err)
      throw err
    }
  }

  public async deserializeNotebook(
    content: Uint8Array,
    token: CancellationToken
  ): Promise<NotebookData> {
    console.log(new Date(), 'deserializeNotebook')
    let notebook: WasmLib.New.Notebook
    try {
      const err = await this.wasmReady
      if (err) {
        throw err
      }
      const { Runme } = globalThis as WasmLib.New.Serializer

      const markdown = content.toString()

      notebook = await Runme.deserialize(markdown)

      if (!notebook || (notebook.cells ?? []).length === 0) {
        return this.#printCell('⚠️ __Error__: no cells found!')
      }
    } catch (err: any) {
      return this.#printCell(
        '⚠️ __Error__: document could not be loaded' +
          (err ? `\n<small>${err.message}</small>` : '') +
          '.<p>Please report bug at https://github.com/stateful/vscode-runme/issues' +
          ' or let us know on Discord (https://discord.gg/stateful)</p>'
      )
    }

    try {
      const cells = notebook.cells ?? []
      notebook.cells = await Promise.all(
        cells.map((elem) => {
          if (
            elem.kind === NotebookCellKind.Code &&
            elem.value &&
            !elem.languageId
          ) {
            const norm = OldSerializer.normalize(elem.value)
            return this.languages.guess(norm, PLATFORM_OS).then((guessed) => {
              elem.languageId = guessed
              return elem
            })
          }
          return Promise.resolve(elem)
        })
      )
    } catch (err: any) {
      console.error(`Error guessing snippet languages: ${err}`)
    }

    const cells = Serializer.revive(notebook)
    return new NotebookData(cells)
  }

  protected static revive(notebook: WasmLib.New.Notebook) {
    return notebook.cells.reduce((accu, elem, index) => {
      let cell: NotebookCellData
      // todo(sebastian): the parser will have to return unsupported as MARKUP
      const isSupported = true //Object.keys(executor).includes(elem.languageId ?? '')

      if (elem.kind === NotebookCellKind.Code && isSupported) {
        cell = new NotebookCellData(
          NotebookCellKind.Code,
          elem.value,
          elem.languageId || DEFAULT_LANG_ID
        )
      } else {
        cell = new NotebookCellData(
          NotebookCellKind.Markup,
          elem.value,
          'markdown'
        )
      }

      // todo(sebastian): incomplete
      cell.metadata = { ...elem.metadata, index }
      accu.push(cell)

      return accu
    }, <NotebookCellData[]>[])
  }

  #printCell(content: string, languageId = 'markdown') {
    return new NotebookData([
      new NotebookCellData(NotebookCellKind.Markup, content, languageId),
    ])
  }
}
