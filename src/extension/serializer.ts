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
  NotebookCellExecutionSummary,
} from 'vscode'
import { GrpcTransport } from '@protobuf-ts/grpc-transport'
import { ulid } from 'ulidx'
import { maskString } from 'data-guardian'
import YAML from 'yaml'

import { FeatureName, Serializer } from '../types'
import {
  NOTEBOOK_AUTOSAVE_ON,
  NOTEBOOK_LIFECYCLE_ID,
  NOTEBOOK_OUTPUTS_MASKED,
  NOTEBOOK_PREVIEW_OUTPUTS,
  OutputType,
  RUNME_FRONTMATTER_PARSED,
  VSCODE_LANGUAGEID_MAP,
} from '../constants'
import { ServerLifecycleIdentity } from '../utils/configuration'

import {
  DeserializeRequest,
  SerializeRequest,
  Notebook,
  RunmeIdentity,
  CellKind,
  CellOutput,
  SerializeRequestOptions,
  RunmeSession,
  Frontmatter,
} from './grpc/serializerTypes'
import { initParserClient, ParserServiceClient, type ReadyPromise } from './grpc/client'
import Languages from './languages'
import { PLATFORM_OS } from './constants'
import { initWasm } from './utils'
import { IServer } from './server/kernelServer'
import { Kernel } from './kernel'
import { getCellById } from './cell'
import { IProcessInfoState } from './terminal/terminalState'
import ContextState from './contextState'
import * as ghost from './ai/ghost'
import getLogger from './logger'
import features from './features'

declare var globalThis: any
const DEFAULT_LANG_ID = 'text'
const log = getLogger('serializer')

type NotebookCellOutputWithProcessInfo = NotebookCellOutput & {
  processInfo?: IProcessInfoState
}

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
          SerializerBase.addCellId(cellAdded.metadata, this.lifecycleIdentity),
        )
        const edit = new WorkspaceEdit()
        edit.set(cellAdded.notebook.uri, [notebookEdit])
        workspace.applyEdit(edit)
      })
    })
  }

  // TODO: Deadcode
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

  public static addCellId(
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
    const cells = await SerializerBase.addExecInfo(data, this.kernel)

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

  public static async addExecInfo(data: NotebookData, kernel: Kernel): Promise<NotebookCellData[]> {
    return Promise.all(
      data.cells.map(async (cell) => {
        let id: string = ''
        let terminalOutput: NotebookCellOutputWithProcessInfo | undefined

        for (const cellOutput of cell.outputs || []) {
          const terminalMime = cellOutput.items.find((item) => item.mime === OutputType.terminal)
          id = cell.metadata?.['runme.dev/id'] || cell.metadata?.['id'] || ''
          if (terminalMime && id) {
            terminalOutput = cellOutput
            break
          }
        }

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
            const norm = SerializerBase.normalize(elem.value)
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
          cell.metadata = SerializerBase.addCellId(elem.metadata, identity)
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

  public static normalize(source: string): string {
    const lines = source.split('\n')
    const normed = lines.filter((l) => !(l.trim().startsWith('```') || l.trim().endsWith('```')))
    return normed.join('\n')
  }

  protected printCell(content: string, languageId = 'markdown') {
    return new NotebookData([new NotebookCellData(NotebookCellKind.Markup, content, languageId)])
  }

  protected abstract saveNotebookOutputsByCacheId(cacheId: string): Promise<number>

  public abstract saveNotebookOutputs(uri: Uri): Promise<number>

  public abstract getMaskedCache(cacheId: string): Promise<Uint8Array> | undefined

  public abstract getPlainCache(cacheId: string): Promise<Uint8Array> | undefined

  public abstract getNotebookDataCache(cacheId: string): NotebookData | undefined

  static isGhostCell(cell: NotebookCellData): boolean {
    const metadata = cell.metadata
    return metadata?.[ghost.ghostKey] === true
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

  protected async saveNotebookOutputsByCacheId(_cacheId: string): Promise<number> {
    console.error('saveNotebookOutputsByCacheId not implemented for WasmSerializer')
    return -1
  }

  public async saveNotebookOutputs(_uri: Uri): Promise<number> {
    console.error('saveNotebookOutputs not implemented for WasmSerializer')
    return -1
  }

  public getMaskedCache(): Promise<Uint8Array> | undefined {
    console.error('getMaskedCache not implemented for WasmSerializer')
    return Promise.resolve(new Uint8Array())
  }

  public getPlainCache(): Promise<Uint8Array> | undefined {
    console.error('getPlainCache not implemented for WasmSerializer')
    return Promise.resolve(new Uint8Array())
  }

  public getNotebookDataCache(): NotebookData | undefined {
    console.error('getNotebookDataCache not implemented for WasmSerializer')
    return {} as NotebookData
  }
}

export class GrpcSerializer extends SerializerBase {
  private client?: ParserServiceClient
  protected ready: ReadyPromise
  // todo(sebastian): naive cache for now, consider use lifecycle events for gc
  protected readonly plainCache = new Map<string, Promise<Uint8Array>>()
  protected readonly maskedCache = new Map<string, Promise<Uint8Array>>()
  protected readonly notebookDataCache = new Map<string, NotebookData>()
  protected readonly cacheDocUriMapping: Map<string, Uri> = new Map<string, Uri>()

  private serverReadyListener: Disposable | undefined

  constructor(
    protected context: ExtensionContext,
    protected server: IServer,
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

    this.disposables.push(
      // todo(sebastian): delete entries on session reset not notebook editor lifecycle
      // workspace.onDidCloseNotebookDocument(this.handleCloseNotebook.bind(this)),
      workspace.onDidSaveNotebookDocument(this.handleSaveNotebookOutputs.bind(this)),
      workspace.onDidOpenNotebookDocument(this.handleOpenNotebook.bind(this)),
    )
  }

  private async initParserClient(transport?: GrpcTransport) {
    this.client = initParserClient(transport ?? (await this.server.transport()))
  }

  protected async handleOpenNotebook(doc: NotebookDocument) {
    const cacheId = GrpcSerializer.getDocumentCacheId(doc.metadata)

    if (!cacheId) {
      return
    }

    if (GrpcSerializer.isDocumentSessionOutputs(doc.metadata)) {
      return
    }

    this.cacheDocUriMapping.set(cacheId, doc.uri)
  }

  protected async handleCloseNotebook(doc: NotebookDocument) {
    const cacheId = GrpcSerializer.getDocumentCacheId(doc.metadata)
    /**
     * Remove cache
     */
    if (cacheId) {
      this.plainCache.delete(cacheId)
      this.maskedCache.delete(cacheId)
    }
  }

  protected async handleSaveNotebookOutputs(doc: NotebookDocument) {
    const cacheId = GrpcSerializer.getDocumentCacheId(doc.metadata)

    if (!cacheId) {
      return
    }

    this.cacheDocUriMapping.set(cacheId, doc.uri)

    await this.saveNotebookOutputsByCacheId(cacheId)
  }

  protected async saveNotebookOutputsByCacheId(cacheId: string): Promise<number> {
    const mode = ContextState.getKey<boolean>(NOTEBOOK_OUTPUTS_MASKED)
    const cache = mode ? this.maskedCache : this.plainCache
    const bytes = await cache.get(cacheId ?? '')

    if (!bytes) {
      return -1
    }

    const srcDocUri = this.cacheDocUriMapping.get(cacheId ?? '')
    if (!srcDocUri) {
      return -1
    }

    const runnerEnv = this.kernel.getRunnerEnvironment()
    const sessionId = runnerEnv?.getSessionId()
    if (!sessionId) {
      return -1
    }

    const sessionFilePath = GrpcSerializer.getOutputsUri(srcDocUri, sessionId)

    // If preview button is clicked, save the outputs to a file
    const isPreview = GrpcSerializer.isPreviewOutput()

    if (isPreview) {
      await ContextState.addKey(NOTEBOOK_PREVIEW_OUTPUTS, false)
    }

    if (await GrpcSerializer.shouldWriteOutputs(sessionFilePath, isPreview)) {
      if (!sessionFilePath) {
        return -1
      }
      await workspace.fs.writeFile(sessionFilePath, bytes)
    }

    return bytes.length
  }

  static isPreviewOutput(): boolean {
    const isPreview = ContextState.getKey<boolean>(NOTEBOOK_PREVIEW_OUTPUTS)
    return isPreview
  }

  static async shouldWriteOutputs(sessionFilePath: Uri, isPreview: boolean): Promise<boolean> {
    const isAutosaveOn = ContextState.getKey<boolean>(NOTEBOOK_AUTOSAVE_ON)
    const isSignedIn = features.isOnInContextState(FeatureName.SignedIn)
    const sessionFileExists = await this.sessionFileExists(sessionFilePath)

    return isPreview || (isAutosaveOn && !isSignedIn) || (isAutosaveOn && sessionFileExists)
  }

  static async sessionFileExists(sessionFilePath: Uri): Promise<boolean> {
    try {
      await workspace.fs.stat(sessionFilePath)
      return true
    } catch (e) {
      return false
    }
  }

  public async saveNotebookOutputs(uri: Uri): Promise<number> {
    let cacheId: string | undefined
    this.cacheDocUriMapping.forEach((docUri, cid) => {
      const src = GrpcSerializer.getSourceFileUri(uri)
      if (docUri.fsPath.toString() === src.fsPath.toString()) {
        cacheId = cid
      }
    })
    if (!cacheId) {
      return -1
    }

    return this.saveNotebookOutputsByCacheId(cacheId ?? '')
  }

  public static getOutputsFilePath(fsPath: string, sid: string): string {
    const fileDir = path.dirname(fsPath)
    const fileExt = path.extname(fsPath)
    const fileBase = path.basename(fsPath, fileExt)
    const filePath = path.normalize(`${fileDir}/${fileBase}-${sid}${fileExt}`)

    return filePath
  }

  public static getOutputsUri(docUri: Uri, sessionId: string): Uri {
    return Uri.parse(GrpcSerializer.getOutputsFilePath(docUri.fsPath, sessionId))
  }

  public static getSourceFilePath(outputsFile: string): string {
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

  public static getSourceFileUri(outputsUri: Uri): Uri {
    return Uri.parse(GrpcSerializer.getSourceFilePath(outputsUri.fsPath))
  }

  protected applyIdentity(data: Notebook): Notebook {
    const identity = this.lifecycleIdentity
    switch (identity) {
      case RunmeIdentity.UNSPECIFIED:
      case RunmeIdentity.DOCUMENT:
        break
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

  public static getDocumentCacheId(
    metadata: { [key: string]: any } | undefined,
  ): string | undefined {
    if (!metadata) {
      return undefined
    }

    // cacheId is always present, stays persistent across multiple de/-serialization cycles
    const cacheId = metadata['runme.dev/cacheId'] as string | undefined

    return cacheId
  }

  public static isDocumentSessionOutputs(metadata: { [key: string]: any } | undefined): boolean {
    if (!metadata) {
      // it's not session outputs unless known
      return false
    }
    const sessionOutputId = metadata[RUNME_FRONTMATTER_PARSED]?.['runme']?.['session']?.['id']
    return Boolean(sessionOutputId)
  }

  public override async switchLifecycleIdentity(
    notebook: NotebookDocument,
    identity: RunmeIdentity,
  ): Promise<boolean> {
    // skip session outputs files
    if (!!notebook.metadata['runme.dev/frontmatterParsed']?.runme?.session?.id) {
      return false
    }

    await notebook.save()
    const source = await workspace.fs.readFile(notebook.uri)
    const des = await this.client!.deserialize(
      DeserializeRequest.create({
        source,
        options: { identity },
      }),
    )

    const deserialized = des.response.notebook
    if (!deserialized) {
      return false
    }

    deserialized.metadata = { ...deserialized.metadata, ...notebook.metadata }
    const notebookEdit = NotebookEdit.updateNotebookMetadata(deserialized.metadata)
    const edits = [notebookEdit]
    notebook.getCells().forEach((cell) => {
      const descell = deserialized.cells[cell.index]
      // skip if no IDs are present, means no cell identity required
      if (!descell.metadata?.['id']) {
        return
      }
      const metadata = { ...descell.metadata, ...cell.metadata }
      metadata['id'] = metadata['runme.dev/id']
      edits.push(NotebookEdit.updateCellMetadata(cell.index, metadata))
    })

    const edit = new WorkspaceEdit()
    edit.set(notebook.uri, edits)
    return await workspace.applyEdit(edit)
  }

  protected async saveNotebook(
    data: NotebookData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: CancellationToken,
  ): Promise<Uint8Array> {
    const marshalFrontmatter = this.lifecycleIdentity === RunmeIdentity.ALL

    const notebook = GrpcSerializer.marshalNotebook(data, { marshalFrontmatter })

    if (marshalFrontmatter) {
      data.metadata ??= {}
      data.metadata[RUNME_FRONTMATTER_PARSED] = notebook.frontmatter
    }

    const cacheId = GrpcSerializer.getDocumentCacheId(data.metadata)
    this.notebookDataCache.set(cacheId as string, data)

    const serialRequest = <SerializeRequest>{ notebook }

    const cacheOutputs = this.cacheNotebookOutputs(notebook, cacheId)
    const request = this.client!.serialize(serialRequest)

    // run in parallel
    const [serialResult] = await Promise.all([request, cacheOutputs])

    if (cacheId) {
      await this.saveNotebookOutputsByCacheId(cacheId)
    }

    const { result } = serialResult.response
    if (result === undefined) {
      throw new Error('serialization of notebook failed')
    }

    return result
  }

  private async cacheNotebookOutputs(
    notebook: Notebook,
    cacheId: string | undefined,
  ): Promise<void> {
    let session: RunmeSession | undefined
    const docUri = this.cacheDocUriMapping.get(cacheId ?? '')
    const sid = this.kernel.getRunnerEnvironment()?.getSessionId()
    if (sid && docUri) {
      const relativePath = path.basename(docUri.fsPath)
      session = {
        id: sid,
        document: { relativePath },
      }
    }

    const outputs = { enabled: true, summary: true }
    const options = SerializeRequestOptions.clone({
      outputs,
      session,
    })

    const maskedNotebook = Notebook.clone(notebook)
    maskedNotebook.cells.forEach((cell) => {
      cell.value = maskString(cell.value)
      cell.outputs.forEach((out) => {
        out.items.forEach((item) => {
          if (item.mime === OutputType.stdout) {
            const outDecoded = Buffer.from(item.data).toString('utf8')
            item.data = Buffer.from(maskString(outDecoded))
          }
        })
      })
    })

    const plainReq = <SerializeRequest>{ notebook, options }
    const plainRes = this.client!.serialize(plainReq)

    const maskedReq = <SerializeRequest>{ notebook: maskedNotebook, options }
    const masked = this.client!.serialize(maskedReq).then((maskedRes) => {
      if (maskedRes.response.result === undefined) {
        console.error('serialization of masked notebook failed')
        return Promise.resolve(new Uint8Array())
      }
      return maskedRes.response.result
    })

    if (!cacheId) {
      console.error('skip masked caching since no lifecycleId was found')
    } else {
      this.maskedCache.set(cacheId, masked)
    }

    const plain = await plainRes
    if (plain.response.result === undefined) {
      throw new Error('serialization of notebook outputs failed')
    }

    const bytes = plain.response.result
    if (!cacheId) {
      console.error('skip plain caching since no lifecycleId was found')
    } else {
      this.plainCache.set(cacheId, Promise.resolve(bytes))
    }

    await Promise.all([plain, masked])
  }

  // marshalNotebook converts VSCode's NotebookData to the Notebook proto.
  public static marshalNotebook(
    data: NotebookData,
    config?: {
      marshalFrontmatter?: boolean
      kernel?: Kernel
    },
  ): Notebook {
    // the bulk copies cleanly except for what's below
    const notebook = Notebook.clone(data as any)

    // cannot gurantee it wasn't changed
    if (notebook.metadata[RUNME_FRONTMATTER_PARSED]) {
      delete notebook.metadata[RUNME_FRONTMATTER_PARSED]
    }

    if (config?.marshalFrontmatter) {
      const metadata = notebook.metadata as unknown as {
        ['runme.dev/frontmatter']: string
      }
      notebook.frontmatter = this.marshalFrontmatter(metadata, config.kernel)
    }

    notebook.cells.forEach(async (cell, cellIdx) => {
      const dataExecSummary = data.cells[cellIdx].executionSummary
      cell.executionSummary = this.marshalCellExecutionSummary(dataExecSummary)
      const dataOutputs = data.cells[cellIdx].outputs
      cell.outputs = this.marshalCellOutputs(cell.outputs, dataOutputs)
    })

    return notebook
  }

  static marshalFrontmatter(
    metadata: { ['runme.dev/frontmatter']?: string },
    kernel?: Kernel,
  ): Frontmatter {
    if (
      !metadata.hasOwnProperty('runme.dev/frontmatter') ||
      typeof metadata['runme.dev/frontmatter'] !== 'string'
    ) {
      log.warn('no frontmatter found in metadata')
      return {
        category: '',
        tag: '',
        cwd: '',
        runme: {
          id: '',
          version: '',
        },
        shell: '',
        skipPrompts: false,
        terminalRows: '',
      }
    }

    const rawFrontmatter = metadata['runme.dev/frontmatter']
    let data: {
      runme: {
        id?: string
        version?: string
      }
    } = { runme: {} }

    if (rawFrontmatter) {
      try {
        const yamlDocs = YAML.parseAllDocuments(metadata['runme.dev/frontmatter'])
        data = (yamlDocs[0].toJS?.() || {}) as typeof data
      } catch (error: any) {
        log.warn('failed to parse frontmatter, reason: ', error.message)
      }
    }

    return {
      runme: {
        id: data.runme?.id || '',
        version: data.runme?.version || '',
        session: { id: kernel?.getRunnerEnvironment()?.getSessionId() || '' },
      },
      category: '',
      tag: '',
      cwd: '',
      shell: '',
      skipPrompts: false,
      terminalRows: '',
    }
  }

  private static marshalCellOutputs(
    outputs: CellOutput[],
    dataOutputs: NotebookCellOutput[] | undefined,
  ): CellOutput[] {
    if (!dataOutputs) {
      return []
    }

    outputs.forEach((out, outIdx) => {
      const dataOut: NotebookCellOutputWithProcessInfo = dataOutputs[outIdx]
      // todo(sebastian): consider sending error state too
      if (dataOut.processInfo?.exitReason?.type === 'exit') {
        if (dataOut.processInfo.exitReason.code) {
          out.processInfo!.exitReason!.code!.value = dataOut.processInfo.exitReason.code
        } else {
          out.processInfo!.exitReason!.code = undefined
        }

        if (dataOut.processInfo?.pid !== undefined) {
          out.processInfo!.pid = { value: dataOut.processInfo.pid.toString() }
        } else {
          out.processInfo!.pid = undefined
        }
      }
      out.items.forEach((item) => {
        item.type = item.data.buffer ? 'Buffer' : typeof item.data
      })
    })

    return outputs
  }

  private static marshalCellExecutionSummary(
    executionSummary: NotebookCellExecutionSummary | undefined,
  ) {
    if (!executionSummary) {
      return undefined
    }

    const { success, timing } = executionSummary
    if (success === undefined || timing === undefined) {
      return undefined
    }

    return {
      success: { value: success },
      timing: {
        endTime: { value: timing!.endTime.toString() },
        startTime: { value: timing!.startTime.toString() },
      },
    }
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

  public getMaskedCache(cacheId: string): Promise<Uint8Array> | undefined {
    return this.maskedCache.get(cacheId)
  }

  public getPlainCache(cacheId: string): Promise<Uint8Array> | undefined {
    return this.plainCache.get(cacheId)
  }

  public getNotebookDataCache(cacheId: string): NotebookData | undefined {
    return this.notebookDataCache.get(cacheId)
  }
}
