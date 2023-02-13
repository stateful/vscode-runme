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
  workspace,
  WorkspaceEdit,
  NotebookEdit,
  NotebookDocumentChangeEvent,
  Disposable,
} from 'vscode'
import { v4 as uuidv4 } from 'uuid'
import { ChannelCredentials } from '@grpc/grpc-js'
import { GrpcTransport } from '@protobuf-ts/grpc-transport'

import { Serializer } from '../types'

import { DeserializeRequest, SerializeRequest, Notebook } from './grpc/types'
import { ParserServiceClient } from './grpc/client'
import Languages from './languages'
import { PLATFORM_OS } from './constants'
import { canEditFile, initWasm } from './utils'

declare var globalThis: any
const DEFAULT_LANG_ID = 'text'

type ReadyPromise = Promise<void | Error>

export abstract class SerializerBase implements NotebookSerializer, Disposable {
  protected abstract readonly ready: ReadyPromise
  protected readonly languages: Languages
  protected disposables: Disposable[] = []

  constructor(protected context: ExtensionContext) {
    this.languages = Languages.fromContext(this.context)
    this.disposables.push(
      workspace.onDidChangeNotebookDocument(
        this.handleNotebookChanged.bind(this)
      )
    )
  }

  public dispose() {
    this.disposables.forEach(d => d.dispose())
  }

  protected handleNotebookChanged(changes: NotebookDocumentChangeEvent) {
    changes.contentChanges.forEach((contentChanges) => {
      contentChanges.addedCells.forEach((cellAdded) => {
        if (
          cellAdded.kind !== NotebookCellKind.Code ||
          cellAdded.metadata['runme.dev/uuid'] !== undefined
        ) {
          return
        }

        const notebookEdit = NotebookEdit.updateCellMetadata(
          cellAdded.index,
          SerializerBase.addCellUuid(cellAdded.metadata)
        )
        const edit = new WorkspaceEdit()
        edit.set(cellAdded.notebook.uri, [notebookEdit])
        workspace.applyEdit(edit)
      })
    })
  }

  public static addCellUuid(
    metadata: Serializer.Metadata | undefined
  ): {
    [key: string]: any
  } {
    return {
      ...metadata || {},
      ...{ 'runme.dev/uuid': uuidv4() },
    }
  }

  protected abstract saveNotebook(
    data: NotebookData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: CancellationToken
  ): Promise<Uint8Array>

  public async serializeNotebook(
    data: NotebookData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: CancellationToken
  ): Promise<Uint8Array> {
    await this.preSaveCheck()

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
    token: CancellationToken
  ): Promise<Serializer.Notebook>

  public async deserializeNotebook(
    content: Uint8Array,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: CancellationToken
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
            const norm = SerializerBase.normalize(elem.value)
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

    const notebookData = new NotebookData(SerializerBase.revive(notebook))
    if (notebook.metadata) {
      notebookData.metadata = notebook.metadata
    }

    return notebookData
  }

  protected async preSaveCheck() {
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

    const err = await this.ready
    if (err) {
      throw err
    }
  }

  protected static revive(notebook: Serializer.Notebook) {
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

      if (cell.kind === NotebookCellKind.Code) {
        // todo(sebastian): decide if the serializer should own lifecycle
        cell.metadata = SerializerBase.addCellUuid(elem.metadata)
      }

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

  protected printCell(content: string, languageId = 'markdown') {
    return new NotebookData([
      new NotebookCellData(NotebookCellKind.Markup, content, languageId),
    ])
  }
}

export class WasmSerializer extends SerializerBase {
  protected readonly ready: ReadyPromise

  constructor(protected context: ExtensionContext) {
    super(context)
    const wasmUri = Uri.joinPath(
      this.context.extensionUri,
      'wasm',
      'runme.wasm'
    )
    this.ready = initWasm(wasmUri)
  }

  protected async saveNotebook(
    data: NotebookData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: CancellationToken
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
    token: CancellationToken
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

  static async initGrpc(): Promise<ParserServiceClient> {
    const transport = new GrpcTransport({
      host: 'unix:///tmp/runme.sock',
      channelCredentials: ChannelCredentials.createInsecure(),
    })

    return new ParserServiceClient(transport)
  }

  constructor(protected context: ExtensionContext) {
    super(context)

    this.ready = GrpcSerializer.initGrpc()
      .then((c) => {
        this.client = c
        return
      })
      .catch((err) => err)
  }

  protected async saveNotebook(
    data: NotebookData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: CancellationToken
  ): Promise<Uint8Array> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const notebook = Notebook.clone(data as any)
    const serialRequest = <SerializeRequest>{ notebook }

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
    token: CancellationToken
  ): Promise<Serializer.Notebook> {
    const deserialRequest = <DeserializeRequest>{ source: content }
    const request = await this.client!.deserialize(deserialRequest)

    const { notebook } = request.response
    if (notebook === undefined) {
      throw new Error('deserialization failed to revive notebook')
    }

    // we can remove ugly casting once we switch to GRPC
    return (notebook as unknown) as Serializer.Notebook
  }
}
