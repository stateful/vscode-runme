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
import { v4 as uuidv4 } from 'uuid'
import { GrpcTransport } from '@protobuf-ts/grpc-transport'

import { Serializer } from '../types'
import { OutputType, VSCODE_LANGUAGEID_MAP } from '../constants'
import { ServerLifecycleIdentity, getServerConfigurationValue } from '../utils/configuration'

import {
  DeserializeRequest,
  SerializeRequest,
  Notebook,
  RunmeIdentity,
  CellKind,
} from './grpc/serializerTypes'
import { initParserClient, ParserServiceClient } from './grpc/client'
import Languages from './languages'
import { PLATFORM_OS } from './constants'
import { initWasm } from './utils'
import RunmeServer from './server/runmeServer'
import { Kernel } from './kernel'
import { getCellByUuId } from './cell'

declare var globalThis: any
const DEFAULT_LANG_ID = 'text'

type ReadyPromise = Promise<void | Error>

export abstract class SerializerBase implements NotebookSerializer, Disposable {
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

  /**
   * Handle newly added cells (live edits) to have UUIDs
   */
  protected handleNotebookChanged(changes: NotebookDocumentChangeEvent) {
    changes.contentChanges.forEach((contentChanges) => {
      contentChanges.addedCells.forEach((cellAdded) => {
        this.kernel.registerNotebookCell(cellAdded)

        if (
          cellAdded.kind !== NotebookCellKind.Code ||
          cellAdded.metadata['runme.dev/uuid'] !== undefined
        ) {
          return
        }

        const notebookEdit = NotebookEdit.updateCellMetadata(
          cellAdded.index,
          SerializerBase.addCellUuid(cellAdded.metadata),
        )
        const edit = new WorkspaceEdit()
        edit.set(cellAdded.notebook.uri, [notebookEdit])
        workspace.applyEdit(edit)
      })
    })
  }

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

  public static addCellUuid(metadata: Serializer.Metadata | undefined): {
    [key: string]: any
  } {
    return {
      ...(metadata || {}),
      ...{ 'runme.dev/uuid': uuidv4() },
    }
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
    const transformedCells = await Promise.all(
      data.cells.map(async (cell) => {
        let terminalOutput: NotebookCellOutput | undefined
        let uuid: string = ''
        for (const out of cell.outputs || []) {
          Object.entries(out.metadata ?? {}).find(([k, v]) => {
            if (k === 'runme.dev/uuid') {
              terminalOutput = out
              uuid = v
            }
          })

          if (terminalOutput) {
            delete out.metadata?.['runme.dev/uuid']
            break
          }
        }

        const notebookCell = await getCellByUuId({ uuid })
        if (notebookCell && terminalOutput) {
          const terminalState = await this.kernel
            .getCellOutputs(notebookCell)
            .then((cellOutputMgr) => {
              const terminalState = cellOutputMgr.getCellTerminalState()
              if (terminalState?.outputType !== OutputType.terminal) {
                return undefined
              }
              return terminalState
            })

          if (terminalState !== undefined) {
            const processInfo = terminalState.hasProcessInfo()
            if (processInfo) {
              ;(terminalOutput as any).processInfo = processInfo
            }
            const strTerminalState = terminalState?.serialize()
            terminalOutput.items.forEach((item) => {
              if (item.mime === OutputType.stdout) {
                item.data = Buffer.from(strTerminalState)
              }
            })
          }
        }

        return {
          ...cell,
          languageId: VSCODE_LANGUAGEID_MAP[cell.languageId] ?? cell.languageId,
        }
      }),
    )

    const metadata = data.metadata

    data = new NotebookData(transformedCells)
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
          if (elem.kind === NotebookCellKind.Code && elem.value && (elem.languageId || '') === '') {
            const norm = SerializerBase.normalize(elem.value)
            return this.languages.guess(norm, PLATFORM_OS).then((guessed) => {
              if (guessed) {
                elem.languageId = guessed
              }
              return elem
            })
          }
          return Promise.resolve(elem)
        }),
      )
    } catch (err: any) {
      console.error(`Error guessing snippet languages: ${err}`)
    }

    notebook.metadata ??= {}
    notebook.metadata['runme.dev/frontmatterParsed'] = notebook.frontmatter

    const notebookData = new NotebookData(SerializerBase.revive(notebook))
    if (notebook.metadata) {
      notebookData.metadata = notebook.metadata
    } else {
      notebookData.metadata = {}
    }

    return notebookData
  }

  protected static revive(notebook: Serializer.Notebook) {
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
          // serializer owns lifecycle because live edits bypass deserialization
          cell.metadata = SerializerBase.addCellUuid(elem.metadata)
        }

        cell.metadata ??= {}
        ;(cell.metadata as Serializer.Metadata)['runme.dev/textRange'] = elem.textRange

        accu.push(cell)

        return accu
      },
      <NotebookCellData[]>[],
    )
  }

  public static normalize(source: string): string {
    const lines = source.split('\n')
    const normed = lines.filter((l) => !(l.trim().startsWith('```') || l.trim().endsWith('```')))
    return normed.join('\n')
  }

  protected printCell(content: string, languageId = 'markdown') {
    return new NotebookData([new NotebookCellData(NotebookCellKind.Markup, content, languageId)])
  }
}

export class WasmSerializer extends SerializerBase {
  protected readonly ready: ReadyPromise

  constructor(
    protected context: ExtensionContext,
    kernel: Kernel,
  ) {
    super(context, kernel)
    const wasmUri = Uri.joinPath(this.context.extensionUri, 'wasm', 'runme.wasm')
    this.ready = initWasm(wasmUri)
  }

  protected async saveNotebook(
    data: NotebookData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: CancellationToken,
  ): Promise<Uint8Array> {
    const { Runme } = globalThis as Serializer.Wasm

    const notebook = JSON.stringify(data)
    const markdown = await Runme.serialize(notebook)

    const encoder = new TextEncoder()
    return encoder.encode(markdown)
  }

  protected async reviveNotebook(
    content: Uint8Array,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: CancellationToken,
  ): Promise<Serializer.Notebook> {
    const { Runme } = globalThis as Serializer.Wasm

    const markdown = Buffer.from(content).toString('utf8')
    const notebook = await Runme.deserialize(markdown)

    if (!notebook) {
      return this.printCell('⚠️ __Error__: no cells found!')
    }
    return notebook
  }
}

export class GrpcSerializer extends SerializerBase {
  private client?: ParserServiceClient
  protected ready: ReadyPromise
  protected readonly lifecycleIdentity: ServerLifecycleIdentity =
    getServerConfigurationValue<ServerLifecycleIdentity>('lifecycleIdentity', RunmeIdentity.ALL)

  private serverReadyListener: Disposable | undefined

  constructor(
    protected context: ExtensionContext,
    protected server: RunmeServer,
    kernel: Kernel,
  ) {
    super(context, kernel)

    this.ready = new Promise((resolve) => {
      const disposable = server.onTransportReady(() => {
        disposable.dispose()
        resolve()
      })
    })

    this.serverReadyListener = server.onTransportReady(({ transport }) =>
      this.initParserClient(transport),
    )
  }

  private async initParserClient(transport?: GrpcTransport) {
    this.client = initParserClient(transport ?? (await this.server.transport()))
  }

  protected applyIdentity(data: Notebook): Notebook {
    const identity = this.lifecycleIdentity
    switch (identity) {
      case RunmeIdentity.UNSPECIFIED:
      case RunmeIdentity.DOCUMENT: {
        break
      }
      default: {
        data.cells.forEach((cell) => {
          if (cell.kind !== CellKind.CODE) {
            return
          }
          if (!cell.metadata?.['id'] && cell.metadata?.['runme.dev/id']) {
            cell.metadata['id'] = cell.metadata['runme.dev/id']
          }
        })
      }
    }

    return data
  }

  protected async saveNotebook(
    data: NotebookData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: CancellationToken,
  ): Promise<Uint8Array> {
    data.cells.forEach((cell) => {
      if (!cell.executionSummary?.timing) {
        delete cell.executionSummary
      }
    })
    const notebook = Notebook.clone(data as any)
    const serialRequest = <SerializeRequest>{ notebook }

    serialRequest.notebook?.cells.forEach(async (cell) => {
      return cell.outputs.forEach((out) =>
        out.items.forEach((item) => (item.type = item.data.buffer ? 'Buffer' : typeof item.data)),
      )
    })

    const request = await this.client!.serialize(serialRequest)

    const { result } = request.response
    if (result === undefined) {
      throw new Error('serialization of notebook failed')
    }

    return result
  }

  protected async reviveNotebook(
    content: Uint8Array,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: CancellationToken,
  ): Promise<Serializer.Notebook> {
    const identity = this.lifecycleIdentity
    const deserialRequest = DeserializeRequest.create({ source: content, options: { identity } })
    const request = await this.client!.deserialize(deserialRequest)

    const { notebook } = request.response
    if (notebook === undefined) {
      throw new Error('deserialization failed to revive notebook')
    }

    const _notebook = this.applyIdentity(notebook)

    // we can remove ugly casting once we switch to GRPC
    return _notebook as unknown as Serializer.Notebook
  }

  public dispose(): void {
    this.serverReadyListener?.dispose()
    super.dispose()
  }
}
