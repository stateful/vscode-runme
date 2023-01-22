import {
  window,
  commands,
  NotebookSerializer,
  ExtensionContext,
  Uri,
  NotebookData,
  NotebookCellData,
  NotebookCellKind,
  CancellationToken,
} from 'vscode'
import { v4 as uuidv4 } from 'uuid'

import { WasmLib } from '../types'

import Languages from './languages'
import { PLATFORM_OS } from './constants'
import { canEditFile, initWasm } from './utils'


declare var globalThis: any
const DEFAULT_LANG_ID = 'text'

export class Serializer implements NotebookSerializer {
  private readonly wasmReady: Promise<Error | void>
  private readonly languages: Languages

  constructor(private context: ExtensionContext) {
    this.languages = Languages.fromContext(this.context)
    const wasmUri = Uri.joinPath(
      this.context.extensionUri,
      'wasm',
      'runme.wasm'
    )
    this.wasmReady = initWasm(wasmUri)
  }

  public async serializeNotebook(
    data: NotebookData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: CancellationToken
  ): Promise<Uint8Array> {
    if (!window.activeNotebookEditor) {
      throw new Error('Could\'t save notebook as it is not active!')
    }

    if (!(await canEditFile(window.activeNotebookEditor.notebook))) {
      const errorMessage =
        'You are writing to a file that is not version controlled! ' +
        'Runme\'s authoring features are in early stages and require hardening. ' +
        'We wouldn\'t want you to loose important data. Please version track your file first ' +
        'or disable this restriction in the VS Code settings.'
      window
        .showErrorMessage(errorMessage, 'Open Runme Settings')
        .then((openSettings) => {
          if (openSettings) {
            return commands.executeCommand(
              'workbench.action.openSettings',
              'runme.flags.disableSaveRestriction'
            )
          }
        })
      throw new Error(
        'saving non version controlled notebooks is disabled by default.'
      )
    }

    const err = await this.wasmReady
    if (err) {
      throw err
    }

    const { Runme } = globalThis as WasmLib.Serializer

    const notebook = JSON.stringify(data)
    const markdown = await Runme.serialize(notebook)

    const encoder = new TextEncoder()
    const encoded = encoder.encode(markdown)

    return encoded
  }

  public async deserializeNotebook(
    content: Uint8Array,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: CancellationToken
  ): Promise<NotebookData> {
    let notebook: WasmLib.Notebook
    try {
      const err = await this.wasmReady
      if (err) {
        throw err
      }
      const { Runme } = globalThis as WasmLib.Serializer
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
            (elem.languageId || '') === ''
          ) {
            const norm = Serializer.normalize(elem.value)
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

    const notebookData = new NotebookData(Serializer.revive(notebook))
    if (notebook.metadata) {
      notebookData.metadata = notebook.metadata
    }
    return notebookData
  }

  protected static revive(notebook: WasmLib.Notebook) {
    return notebook.cells.reduce((accu, elem) => {
      let cell: NotebookCellData

      if (elem.kind === NotebookCellKind.Code) {
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

      cell.metadata = { ...elem.metadata }
      // todo(sebastian): decide if the serializer should own lifecycle
      cell.metadata['runme.dev/uuid'] = uuidv4()

      accu.push(cell)

      return accu
    }, <NotebookCellData[]>[])
  }

  public static normalize(source: string): string {
    const lines = source.split('\n')
    const normed = lines.filter(
      (l) => !(l.trim().startsWith('```') || l.trim().endsWith('```'))
    )
    return normed.join('\n')
  }

  #printCell(content: string, languageId = 'markdown') {
    return new NotebookData([
      new NotebookCellData(NotebookCellKind.Markup, content, languageId),
    ])
  }
}
