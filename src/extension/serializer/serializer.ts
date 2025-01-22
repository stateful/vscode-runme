import path from 'node:path'

import {
  NotebookSerializer,
  ExtensionContext,
  Uri,
  NotebookData,
  NotebookCellData,
  NotebookCellKind,
  CancellationToken,
  workspace,
  WorkspaceEdit,
  NotebookEdit,
  NotebookDocumentChangeEvent,
  Disposable,
  NotebookDocument,
  CancellationTokenSource,
  NotebookCellOutput,
} from 'vscode'
import { ulid } from 'ulidx'

import { Serializer } from '../../types'
import {
  NOTEBOOK_LIFECYCLE_ID,
  OutputType,
  RUNME_FRONTMATTER_PARSED,
  VSCODE_LANGUAGEID_MAP,
} from '../../constants'
import { ServerLifecycleIdentity } from '../../utils/configuration'
import { RunmeIdentity } from '../grpc/parser/connect/types'
import { type ReadyPromise } from '../grpc/tcpClient'
import Languages from '../languages'
import { PLATFORM_OS } from '../constants'
import { Kernel } from '../kernel'
import { getCellById } from '../cell'
import ContextState from '../contextState'
import * as ghost from '../ai/ghost'
import { IProcessInfoState } from '../terminal/terminalState'

const DEFAULT_LANG_ID = 'text'
// const log = getLogger('serializer')

export interface ISerializer extends NotebookSerializer, Disposable {
  dispose(): void
  serializeNotebook(data: NotebookData, token: CancellationToken): Promise<Uint8Array>
  deserializeNotebook(content: Uint8Array, token: CancellationToken): Promise<NotebookData>
  switchLifecycleIdentity(notebook: NotebookDocument, identity: RunmeIdentity): Promise<boolean>
  saveNotebookOutputs(uri: Uri): Promise<number>
  getMaskedCache(cacheId: string): Promise<Uint8Array> | undefined
  getPlainCache(cacheId: string): Promise<Uint8Array> | undefined
  getNotebookDataCache(cacheId: string): NotebookData | undefined
}

export type NotebookCellOutputWithProcessInfo = NotebookCellOutput & {
  processInfo?: IProcessInfoState
}

export abstract class SerializerBase implements ISerializer {
  protected abstract readonly ready: ReadyPromise
  protected readonly languages: Languages
  protected disposables: Disposable[] = []

  constructor(
    protected context: ExtensionContext,
    protected kernel: Kernel,
  ) {
    this.languages = Languages.fromContext(this.context)
    this.disposables.push(
      workspace.onDidChangeNotebookDocument(this.handleNotebookChanged.bind(this)),
      // workspace.onDidSaveNotebookDocument(
      //   this.handleNotebookSaved.bind(this)
      // )
    )
  }

  public dispose() {
    this.disposables.forEach((d) => d.dispose())
  }

  protected get lifecycleIdentity() {
    return ContextState.getKey<ServerLifecycleIdentity>(NOTEBOOK_LIFECYCLE_ID)
  }

  /**
   * Handle newly added cells (live edits) to have IDs
   */
  protected handleNotebookChanged(changes: NotebookDocumentChangeEvent) {
    changes.contentChanges.forEach((contentChanges) => {
      contentChanges.addedCells.forEach((cellAdded) => {
        this.kernel.registerNotebookCell(cellAdded)

        if (
          cellAdded.kind !== NotebookCellKind.Code ||
          cellAdded.metadata['runme.dev/id'] !== undefined
        ) {
          return
        }

        const notebookEdit = NotebookEdit.updateCellMetadata(
          cellAdded.index,
          addRunmeCellId(cellAdded.metadata, this.lifecycleIdentity),
        )
        const edit = new WorkspaceEdit()
        edit.set(cellAdded.notebook.uri, [notebookEdit])
        workspace.applyEdit(edit)
      })
    })
  }

  // todo(sebastian): dead code? why?
  protected async handleNotebookSaved({ uri, cellAt }: NotebookDocument) {
    // update changes in metadata
    const bytes = await workspace.fs.readFile(uri)
    const deserialized = await this.deserializeNotebook(bytes, new CancellationTokenSource().token)

    const notebookEdits = deserialized.cells.flatMap((updatedCell, i) => {
      const updatedName = (updatedCell.metadata as Serializer.Metadata | undefined)?.[
        'runme.dev/name'
      ]
      if (!updatedName) {
        return []
      }

      const oldCell = cellAt(i)
      return [
        NotebookEdit.updateCellMetadata(i, {
          ...(oldCell.metadata || {}),
          'runme.dev/name': updatedName,
        } as Serializer.Metadata),
      ]
    })

    const edit = new WorkspaceEdit()
    edit.set(uri, notebookEdits)

    await workspace.applyEdit(edit)
  }

  protected abstract saveNotebook(
    data: NotebookData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: CancellationToken,
  ): Promise<Uint8Array>

  public async serializeNotebook(
    data: NotebookData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: CancellationToken,
  ): Promise<Uint8Array> {
    const cells = await addExecInfo(data, this.kernel)

    const metadata = data.metadata

    // Prune any ghost cells when saving.
    const cellsToSave = []
    for (let i = 0; i < cells.length; i++) {
      if (SerializerBase.isGhostCell(cells[i])) {
        continue
      }
      cellsToSave.push(cells[i])
    }

    data = new NotebookData(cellsToSave)
    data.metadata = metadata

    let encoded: Uint8Array
    try {
      encoded = await this.saveNotebook(data, token)
    } catch (err: any) {
      console.error(err)
      throw err
    }

    return encoded
  }

  protected abstract reviveNotebook(
    content: Uint8Array,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: CancellationToken,
  ): Promise<Serializer.Notebook>

  public async deserializeNotebook(
    content: Uint8Array,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: CancellationToken,
  ): Promise<NotebookData> {
    let notebook: Serializer.Notebook
    try {
      const err = await this.ready
      if (err) {
        throw err
      }
      notebook = await this.reviveNotebook(content, token)
    } catch (err: any) {
      return this.printCell(
        '⚠️ __Error__: document could not be loaded' +
          (err ? `\n<small>${err.message}</small>` : '') +
          '.<p>Please report bug at https://github.com/stateful/vscode-runme/issues' +
          ' or let us know on Discord (https://discord.gg/stateful)</p>',
      )
    }

    try {
      const cells = notebook.cells ?? []
      notebook.cells = await Promise.all(
        cells.map((elem) => {
          if (elem.kind !== NotebookCellKind.Code) {
            return Promise.resolve(elem)
          }

          if (elem.value && (elem.languageId || '') === '') {
            const norm = normalize(elem.value)
            return this.languages.guess(norm, PLATFORM_OS).then((guessed) => {
              if (guessed) {
                elem.languageId = guessed
              }
              return elem
            })
          }

          if (elem.languageId && VSCODE_LANGUAGEID_MAP[elem.languageId]) {
            elem.languageId = VSCODE_LANGUAGEID_MAP[elem.languageId]
          }

          return Promise.resolve(elem)
        }),
      )
    } catch (err: any) {
      console.error(`Error guessing snippet languages: ${err}`)
    }

    notebook.metadata ??= {}
    notebook.metadata[RUNME_FRONTMATTER_PARSED] = notebook.frontmatter

    const notebookData = new NotebookData(SerializerBase.revive(notebook, this.lifecycleIdentity))
    if (notebook.metadata) {
      notebookData.metadata = notebook.metadata
    } else {
      notebookData.metadata = {}
    }

    return notebookData
  }

  // revive converts the Notebook proto to VSCode's NotebookData.
  // It returns a an array of VSCode NotebookCellData objects.
  public static revive(notebook: Serializer.Notebook, identity: RunmeIdentity) {
    return notebook.cells.reduce(
      (accu, elem) => {
        let cell: NotebookCellData

        if (elem.kind === NotebookCellKind.Code) {
          cell = new NotebookCellData(
            NotebookCellKind.Code,
            elem.value,
            elem.languageId || DEFAULT_LANG_ID,
          )
        } else {
          cell = new NotebookCellData(NotebookCellKind.Markup, elem.value, 'markdown')
        }

        if (cell.kind === NotebookCellKind.Code) {
          // The serializer used to own the lifecycle of IDs, however,
          // that's no longer true since they are coming out of the kernel now.
          // However, if "net new" cells show up after deserialization, ie inserts, we backfill them here.
          cell.metadata = addRunmeCellId(elem.metadata, identity)
        }

        cell.metadata ??= {}
        ;(cell.metadata as Serializer.Metadata)['runme.dev/textRange'] = elem.textRange

        accu.push(cell)

        return accu
      },
      <NotebookCellData[]>[],
    )
  }

  public async switchLifecycleIdentity(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    notebook: NotebookDocument,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    identity: RunmeIdentity,
  ): Promise<boolean> {
    return false
  }

  protected printCell(content: string, languageId = 'markdown') {
    return new NotebookData([new NotebookCellData(NotebookCellKind.Markup, content, languageId)])
  }

  protected abstract saveNotebookOutputsByCacheId(cacheId: string): Promise<number>

  public abstract saveNotebookOutputs(uri: Uri): Promise<number>

  public abstract getMaskedCache(cacheId: string): Promise<Uint8Array> | undefined

  public abstract getPlainCache(cacheId: string): Promise<Uint8Array> | undefined

  public abstract getNotebookDataCache(cacheId: string): NotebookData | undefined

  protected static isGhostCell(cell: NotebookCellData): boolean {
    const metadata = cell.metadata
    return metadata?.[ghost.ghostKey] === true
  }
}

export function addRunmeCellId(
  metadata: Serializer.Metadata | undefined,
  identity: RunmeIdentity,
): {
  [key: string]: any
} {
  // never run for cells that came out of kernel
  if (metadata?.['runme.dev/id']) {
    return metadata
  }

  // newly inserted cells may have blank metadata
  const id = metadata?.['id'] || ulid()

  // only set `id` if all or cell identity is required
  if (identity === RunmeIdentity.ALL || identity === RunmeIdentity.CELL) {
    return {
      ...(metadata || {}),
      ...{ 'runme.dev/id': id, id },
    }
  }

  return {
    ...(metadata || {}),
    ...{ 'runme.dev/id': id },
  }
}

export async function addExecInfo(data: NotebookData, kernel: Kernel): Promise<NotebookCellData[]> {
  return Promise.all(
    data.cells.map(async (cell) => {
      // The NotebookData structure doesn't include transient metadata,
      // but We need the cell ID to properly track terminal outputs.
      // I extract the cell ID from the terminal output metadata
      // since this preserves the connection between cells and their outputs.
      // This is particularly problematic when lifecycleIdentity is NONE
      // since cells won't have IDs assigned directly.
      const cellOutputs: NotebookCellOutput[] = cell.outputs || []
      const terminalOutputs = cellOutputs.reduce(
        (acc, curr) => {
          if (!curr.items) {
            return acc
          }

          const terminalOutput = curr.items.find((item) => item.mime === OutputType.terminal)

          if (terminalOutput) {
            acc[curr?.metadata?.['runme.dev/id']] = curr
          }

          return acc
        },
        {} as { [key: string]: NotebookCellOutputWithProcessInfo },
      )

      // Currently we assume each cell has at most one terminal output,
      // so we only take the first entry
      const entries = Object.entries(terminalOutputs)
      const [id, terminalOutput] = entries.length > 0 ? entries[0] : ['', undefined]

      const notebookCell = await getCellById({ id })
      if (notebookCell && terminalOutput) {
        const terminalState = await kernel.getCellOutputs(notebookCell).then((cellOutputMgr) => {
          const terminalState = cellOutputMgr.getCellTerminalState()
          if (terminalState?.outputType !== OutputType.terminal) {
            return undefined
          }
          return terminalState
        })

        if (terminalState !== undefined) {
          const processInfo = terminalState.hasProcessInfo()
          if (processInfo) {
            if (processInfo.pid === undefined) {
              delete processInfo.pid
            }
            terminalOutput.processInfo = processInfo
          }
          const strTerminalState = terminalState?.serialize()
          terminalOutput.items.forEach((item) => {
            if (item.mime === OutputType.stdout) {
              item.data = Buffer.from(strTerminalState)
            }
          })
        }
      }

      const languageId = cell.languageId ?? ''

      return {
        ...cell,
        languageId: VSCODE_LANGUAGEID_MAP[languageId] ?? languageId,
      }
    }),
  )
}

export function normalize(source: string): string {
  const lines = source.split('\n')
  const normed = lines.filter((l) => !(l.trim().startsWith('```') || l.trim().endsWith('```')))
  return normed.join('\n')
}

export function getOutputsFilePath(fsPath: string, sid: string): string {
  const fileDir = path.dirname(fsPath)
  const fileExt = path.extname(fsPath)
  const fileBase = path.basename(fsPath, fileExt)
  const filePath = path.normalize(`${fileDir}/${fileBase}-${sid}${fileExt}`)

  return filePath
}

export function getOutputsUri(docUri: Uri, sessionId: string): Uri {
  const fspath = getOutputsFilePath(docUri.fsPath, sessionId)
  const query = docUri.query
  return Uri.parse(`${docUri.scheme}://${fspath}?${query}`)
}

export function getDocumentCacheId(
  metadata: { [key: string]: any } | undefined,
): string | undefined {
  if (!metadata) {
    return undefined
  }

  // cacheId is always present, stays persistent across multiple de/-serialization cycles
  const cacheId = metadata['runme.dev/cacheId'] as string | undefined

  return cacheId
}

export function isDocumentSessionOutputs(metadata: { [key: string]: any } | undefined): boolean {
  if (!metadata) {
    // it's not session outputs unless known
    return false
  }
  const sessionOutputId = metadata[RUNME_FRONTMATTER_PARSED]?.['runme']?.['session']?.['id']
  return Boolean(sessionOutputId)
}

export function getSourceFilePath(outputsFile: string): string {
  const fileExt = path.extname(outputsFile)
  let fileBase = path.basename(outputsFile, fileExt)
  const parts = fileBase.split('-')
  if (parts.length > 1) {
    parts.pop()
  }
  fileBase = parts.join('-')
  const fileDir = path.dirname(outputsFile)
  const filePath = path.normalize(`${fileDir}/${fileBase}${fileExt}`)

  return filePath
}

export function getSourceFileUri(outputsUri: Uri): Uri {
  return Uri.parse(getSourceFilePath(outputsUri.fsPath))
}
