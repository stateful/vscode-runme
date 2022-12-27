/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  workspace,
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
import { serialize, deserialize } from 'runme'
import type { Cell } from 'runme/dist/types'

import Languages from './languages'
import { PLATFORM_OS } from './constants'
import { canEditFile } from './utils'

const DEFAULT_LANG_ID = 'text'

declare var globalThis: any

export class Serializer implements NotebookSerializer {
  private readonly languages: Languages

  constructor(private context: ExtensionContext) {
    this.languages = Languages.fromContext(this.context)
  }

  public async serializeNotebook(
    data: NotebookData,
    token: CancellationToken
  ): Promise<Uint8Array> {
    if (!window.activeNotebookEditor) {
      throw new Error('Could\'t save notebook as it is not active!')
    }

    if (!await canEditFile(window.activeNotebookEditor.notebook)) {
      const errorMessage = (
        'You are writing to a file that is not version controlled! ' +
        'Runme\'s authoring features are in early stages and require hardening. ' +
        'We wouldn\'t want you to loose important data. Please version track your file first ' +
        'or disable this restriction in the VS Code settings.'
      )
      window.showErrorMessage(errorMessage, 'Open Runme Settings').then((openSettings) => {
        if (openSettings) {
          return commands.executeCommand('workbench.action.openSettings', 'runme.flags.disableSaveRestriction')
        }
      })
      throw new Error('saving non version controlled notebooks is disabled by default.')
    }

    const markdown = await serialize(data as any)
    const encoder = new TextEncoder()
    const encoded = encoder.encode(markdown)
    return encoded
  }

  public async deserializeNotebook(
    content: Uint8Array,
    token: CancellationToken
  ): Promise<NotebookData> {
    let cells: Cell[] = []
    try {
      const markdown = content.toString()
      cells = await deserialize(markdown)
    } catch (err: any) {
      return this.#printCell(
        '⚠️ __Error__: document could not be loaded' +
          (err ? `\n<small>${err.message}</small>` : '') +
          '.<p>Please report bug at https://github.com/stateful/vscode-runme/issues' +
          ' or let us know on Discord (https://discord.gg/stateful)</p>'
      )
    }

    try {
      cells = await Promise.all(
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

    const notebookCells = Serializer.revive(cells)
    return new NotebookData(notebookCells)
  }

  protected static revive(cells: Cell[]) {
    return cells.reduce((accu, elem) => {
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

      cell.metadata = { ...elem.metadata }
      accu.push(cell)

      return accu
    }, <NotebookCellData[]>[])
  }

  public static normalize(source: string): string {
    const lines = source.split('\n')
    const normed = lines.filter(l => !(l.trim().startsWith('```') || l.trim().endsWith('```')))
    return normed.join('\n')
  }

  #printCell(content: string, languageId = 'markdown') {
    return new NotebookData([
      new NotebookCellData(NotebookCellKind.Markup, content, languageId),
    ])
  }
}
