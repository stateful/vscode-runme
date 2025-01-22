import path from 'node:path'

import {
  ExtensionContext,
  Uri,
  NotebookData,
  CancellationToken,
  workspace,
  WorkspaceEdit,
  NotebookEdit,
  Disposable,
  NotebookDocument,
  NotebookCellOutput,
  NotebookCellExecutionSummary,
} from 'vscode'
import { maskString } from 'data-guardian'
import YAML from 'yaml'

import { FeatureName, Serializer } from '../../types'
import {
  NOTEBOOK_AUTOSAVE_ON,
  NOTEBOOK_OUTPUTS_MASKED,
  NOTEBOOK_PREVIEW_OUTPUTS,
  OutputType,
  RUNME_FRONTMATTER_PARSED,
} from '../../constants'
import { ParserService, createConnectClient, ConnectClient } from '../grpc/parser/connect/client'
import {
  RunmeIdentity,
  RunmeSession,
  Notebook,
  Frontmatter,
  CellOutput,
  CellKind,
  CellExecutionSummary,
  DeserializeRequest,
  SerializeRequest,
  SerializeRequestOptions,
} from '../grpc/parser/connect/types'
import { type ReadyPromise } from '../grpc/tcpClient'
import KernelServer from '../server/kernelServer'
import { Kernel } from '../kernel'
import ContextState from '../contextState'
import getLogger from '../logger'
import features from '../features'
import { togglePreviewOutputs } from '../commands'

import {
  getDocumentCacheId,
  getOutputsUri,
  getSourceFileUri,
  isDocumentSessionOutputs,
  NotebookCellOutputWithProcessInfo,
  SerializerBase,
} from './serializer'

const log = getLogger('grpc')

export class ConnectSerializer extends SerializerBase {
  private client!: ConnectClient<typeof ParserService>
  protected ready: ReadyPromise
  protected serverUrl!: string

  // todo(sebastian): naive cache for now, consider use lifecycle events for gc
  protected readonly plainCache = new Map<string, Promise<Buffer>>()
  protected readonly maskedCache = new Map<string, Promise<Buffer>>()
  protected readonly notebookDataCache = new Map<string, NotebookData>()
  protected readonly cacheDocUriMapping: Map<string, Uri> = new Map<string, Uri>()

  private serverReadyListener?: Disposable

  constructor(
    protected context: ExtensionContext,
    protected server: KernelServer,
    kernel: Kernel,
  ) {
    super(context, kernel)

    // cleanup listener when it's outlived its purpose
    this.ready = new Promise((resolve) => {
      const disposable = server.onConnectTransportReady(() => {
        disposable.dispose()
        resolve()
      })
    })

    // if the event has fired the transport is ready, go ahead and use it to create our parser client
    this.serverReadyListener = server.onConnectTransportReady(({ transport }) => {
      this.client = createConnectClient(ParserService, transport)
    })

    this.disposables.push(
      // todo(sebastian): delete entries on session reset not notebook editor lifecycle
      // workspace.onDidCloseNotebookDocument(this.handleCloseNotebook.bind(this)),
      workspace.onDidSaveNotebookDocument(this.handleSaveNotebookOutputs.bind(this)),
      workspace.onDidOpenNotebookDocument(this.handleOpenNotebook.bind(this)),
    )
  }

  protected async handleOpenNotebook(doc: NotebookDocument) {
    const cacheId = getDocumentCacheId(doc.metadata)

    if (!cacheId) {
      return
    }

    if (isDocumentSessionOutputs(doc.metadata)) {
      return
    }

    this.cacheDocUriMapping.set(cacheId, doc.uri)
  }

  protected async handleCloseNotebook(doc: NotebookDocument) {
    const cacheId = getDocumentCacheId(doc.metadata)
    /**
     * Remove cache
     */
    if (cacheId) {
      this.plainCache.delete(cacheId)
      this.maskedCache.delete(cacheId)
    }
  }

  protected async handleSaveNotebookOutputs(doc: NotebookDocument) {
    const cacheId = getDocumentCacheId(doc.metadata)

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

    const sessionFilePath = getOutputsUri(srcDocUri, sessionId)

    // If preview button is clicked, save the outputs to a file
    const isPreview = ConnectSerializer.isPreviewOutput()

    if (isPreview) {
      await togglePreviewOutputs(false)
    }

    const showWriteOutputs = await ConnectSerializer.shouldWriteOutputs(sessionFilePath, isPreview)
    if (showWriteOutputs) {
      if (!sessionFilePath) {
        return -1
      }
      await workspace.fs.writeFile(sessionFilePath, bytes)
    }

    return bytes.length
  }

  private static isPreviewOutput(): boolean {
    const isPreview = ContextState.getKey<boolean>(NOTEBOOK_PREVIEW_OUTPUTS)
    return isPreview
  }

  private static async shouldWriteOutputs(
    sessionFilePath: Uri,
    isPreview: boolean,
  ): Promise<boolean> {
    const isAutosaveOn = ContextState.getKey<boolean>(NOTEBOOK_AUTOSAVE_ON)
    const isSignedIn = features.isOnInContextState(FeatureName.SignedIn)
    const sessionFileExists = await this.sessionFileExists(sessionFilePath)

    return isPreview || (isAutosaveOn && !isSignedIn) || (isAutosaveOn && sessionFileExists)
  }

  private static async sessionFileExists(sessionFilePath: Uri): Promise<boolean> {
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
      const src = getSourceFileUri(uri)
      if (docUri.fsPath.toString() === src.fsPath.toString()) {
        cacheId = cid
      }
    })
    if (!cacheId) {
      return -1
    }

    return this.saveNotebookOutputsByCacheId(cacheId ?? '')
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
    const dreq = new DeserializeRequest({
      source,
      options: { identity },
    })

    const deserialized = (await this.client.deserialize(dreq)).notebook

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

    const notebook = ConnectSerializer.marshalNotebook(data, { marshalFrontmatter })

    if (marshalFrontmatter) {
      data.metadata ??= {}
      data.metadata[RUNME_FRONTMATTER_PARSED] = notebook.frontmatter
    }

    const cacheId = getDocumentCacheId(data.metadata)
    this.notebookDataCache.set(cacheId as string, data)

    const serialRequest = new SerializeRequest({ notebook })

    const cacheOutputs = this.cacheNotebookOutputs(notebook, cacheId)
    const request = this.client.serialize(serialRequest)

    // run in parallel
    const [serialResult] = await Promise.all([request, cacheOutputs])

    if (cacheId) {
      await this.saveNotebookOutputsByCacheId(cacheId)
    }

    if (serialResult.result === undefined) {
      throw new Error('serialization of notebook failed')
    }

    return serialResult.result
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
      session = new RunmeSession({
        id: sid,
        document: { relativePath },
      })
    }

    const outputs = { enabled: true, summary: true }
    const options = new SerializeRequestOptions({
      outputs,
      session,
    })

    const maskedNotebook = notebook.clone()
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

    const plainReq = new SerializeRequest({ notebook, options })
    const plainRes = this.client.serialize(plainReq)

    const maskedReq = new SerializeRequest({ notebook: maskedNotebook, options })
    const masked = this.client.serialize(maskedReq).then((maskedRes) => {
      if (maskedRes.result === undefined) {
        console.error('serialization of masked notebook failed')
        return Promise.resolve(Buffer.from(''))
      }
      return Buffer.from(maskedRes.result)
    })

    if (!cacheId) {
      console.error('skip masked caching since no lifecycleId was found')
    } else {
      this.maskedCache.set(cacheId, masked)
    }

    const plain = await plainRes
    if (plain.result === undefined) {
      throw new Error('serialization of notebook outputs failed')
    }

    const bytes = Buffer.from(plain.result)
    if (!cacheId) {
      console.error('skip plain caching since no lifecycleId was found')
    } else {
      this.plainCache.set(cacheId, Promise.resolve(bytes))
    }

    await Promise.all([plain, masked])
  }

  // vscode/NotebookData to buf-es/Notebook
  public static marshalNotebook(
    data: NotebookData,
    config?: {
      marshalFrontmatter?: boolean
      kernel?: Kernel
    },
  ): Notebook {
    // the bulk copies cleanly except for what's below
    const notebook = new Notebook(data as any)

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

  public static marshalFrontmatter(
    metadata: { ['runme.dev/frontmatter']?: string; 'runme.dev/id'?: string },
    kernel?: Kernel,
  ): Frontmatter {
    if (
      !metadata.hasOwnProperty('runme.dev/frontmatter') ||
      typeof metadata['runme.dev/frontmatter'] !== 'string'
    ) {
      log.warn('no frontmatter found in metadata')
      return new Frontmatter({
        category: '',
        tag: '',
        cwd: '',
        runme: {
          id: metadata['runme.dev/id'] || '',
          version: '',
          session: { id: kernel?.getRunnerEnvironment()?.getSessionId() || '' },
        },
        shell: '',
        skipPrompts: false,
        terminalRows: '',
      })
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

    return new Frontmatter({
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
    })
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
          out.processInfo!.exitReason!.code = dataOut.processInfo.exitReason.code
        } else {
          out.processInfo!.exitReason!.code = undefined
        }

        if (dataOut.processInfo?.pid !== undefined) {
          out.processInfo!.pid = BigInt(dataOut.processInfo.pid)
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
  ): CellExecutionSummary | undefined {
    if (!executionSummary) {
      return undefined
    }

    const { success, timing } = executionSummary
    if (success === undefined || timing === undefined) {
      return undefined
    }

    return new CellExecutionSummary({
      success: success,
      timing: {
        endTime: BigInt(timing!.endTime),
        startTime: BigInt(timing!.startTime),
      },
    })
  }

  protected async reviveNotebook(
    content: Uint8Array,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: CancellationToken,
  ): Promise<Serializer.Notebook> {
    const identity = this.lifecycleIdentity
    const deserializeRequest = new DeserializeRequest({
      source: content,
      options: { identity },
    })
    let res
    try {
      res = await this.client.deserialize(deserializeRequest)
    } catch (e: any) {
      if (e.name === 'ConnectError') {
        e.message = `Unable to connect to the serializer service at ${this.serverUrl}`
      }
      log.error('Error in reviveNotebook  ', e as any)
      throw e
    }
    const notebook = res.notebook

    if (notebook === undefined) {
      throw new Error('deserialization failed to revive notebook')
    }

    this.applyIdentity(notebook)

    if (!notebook) {
      return this.printCell('⚠️ __Error__: no cells found!')
    }
    // we can remove ugly casting once we switch to GRPC
    return notebook as unknown as Serializer.Notebook
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
