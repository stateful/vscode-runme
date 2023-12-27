import {
  CancellationTokenSource,
  NotebookData,
  NotebookDocument,
  NotebookEdit,
  window,
  workspace,
} from 'vscode'
import { expect, vi, it, describe, beforeEach } from 'vitest'

import { GrpcSerializer, SerializerBase, WasmSerializer } from '../../src/extension/serializer'
import type { Kernel } from '../../src/extension/kernel'
import { EventEmitter, Uri } from '../../__mocks__/vscode'
import { Serializer } from '../../src/types'

import fixtureMarshalNotebook from './fixtures/marshalNotebook.json'

globalThis.Go = vi.fn()
globalThis.Runme = { serialize: vi.fn().mockResolvedValue('Hello World!') }

vi.mock('../../src/extension/grpc/client', () => ({
  ParserServiceClient: vi.fn(),
}))

vi.mock('vscode', () => ({
  window: {
    activeNotebookEditor: undefined,
    showErrorMessage: vi.fn().mockResolvedValue({}),
  },
  Uri: { joinPath: vi.fn().mockReturnValue('/foo/bar') },
  workspace: {
    fs: { readFile: vi.fn().mockResolvedValue({}), writeFile: vi.fn() },
    onDidChangeNotebookDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onDidSaveNotebookDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    onDidOpenNotebookDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    applyEdit: vi.fn(),
    getConfiguration: vi.fn().mockReturnValue({
      update: vi.fn(),
      get: vi.fn(),
    }),
    notebookDocuments: [],
  },
  commands: { executeCommand: vi.fn() },
  WorkspaceEdit: Map<Uri, NotebookEdit[]>,
  NotebookEdit: {
    updateCellMetadata: (i: number, metadata: any) => ({ i, metadata, type: 'updateCellMetadata' }),
  },
  CancellationTokenSource: vi.fn(),
  NotebookData: class {
    constructor(public cells: any[]) {}
  },
}))

vi.mock('../../src/extension/languages', () => ({
  default: {
    fromContext: vi.fn(),
  },
  NotebookData: class {},
}))

vi.mock('../../src/extension/utils', () => ({
  initWasm: vi.fn(),
}))

function newKernel(): Kernel {
  return {} as unknown as Kernel
}

describe('SerializerBase', () => {
  const context: any = {
    extensionUri: { fsPath: '/foo/bar' },
  }

  it('serializeNotebook transforms languages', async () => {
    const TestSerializer = class extends SerializerBase {
      protected ready: Promise<void | Error> = Promise.resolve()

      protected async saveNotebook(data: NotebookData): Promise<Uint8Array> {
        return data as any
      }

      protected async reviveNotebook(content: Uint8Array): Promise<Serializer.Notebook> {
        return content as any
      }

      protected async preSaveCheck() {}
    }

    const serializer = new TestSerializer({} as any, {} as any)

    const processed = (await serializer['serializeNotebook'](
      {
        cells: [
          {
            languageId: 'shellscript',
          },
          {
            languageId: 'javascriptreact',
          },
          {
            languageId: 'typescriptreact',
          },
          {
            languageId: 'python',
          },
        ],
      } as any,
      {} as any,
    )) as any

    expect(processed.cells).toStrictEqual([
      {
        languageId: 'sh',
      },
      {
        languageId: 'jsx',
      },
      {
        languageId: 'tsx',
      },
      {
        languageId: 'python',
      },
    ])
  })

  describe('handleNotebookSaved', () => {
    const _onDidSaveNotebookDocument = new EventEmitter<NotebookDocument>()

    beforeEach(() => {
      vi.mocked(workspace.onDidSaveNotebookDocument).mockImplementation((l) =>
        _onDidSaveNotebookDocument.event(l),
      )

      vi.mocked(workspace.applyEdit).mockClear()
    })

    it('updates cell names on save', async () => {
      const s = new WasmSerializer(context, newKernel())

      s['deserializeNotebook'] = vi.fn(
        () =>
          ({
            cells: [
              {
                metadata: {
                  'runme.dev/name': 'newName',
                  interactive: true,
                },
              },
            ],
          }) as any,
      )

      const uri = Uri.file('/foo/bar')

      await _onDidSaveNotebookDocument.fireAsync({
        uri,
        cellAt: () => ({ metadata: { 'runme.dev/name': 'oldName', interactive: false } }),
      } as any)

      expect(workspace.applyEdit).toHaveBeenCalledTimes(0)

      // const edit = vi.mocked(workspace.applyEdit).mock.calls[0][0]
      // expect(edit).toBeTruthy()

      // const edits = edit.get(uri)
      // expect(edits).toHaveLength(1)

      // expect(edits[0]).toStrictEqual({
      //   i: 0,
      //   type: 'updateCellMetadata',
      //   metadata: {
      //     interactive: false,
      //     'runme.dev/name': 'newName',
      //   }
      // })
    })
  })
})

describe('WasmSerializer', () => {
  const context: any = {
    extensionUri: { fsPath: '/foo/bar' },
  }

  describe('serializeNotebook', () => {
    it('uses Runme wasm to save the file', async () => {
      // @ts-ignore readonly
      window.activeNotebookEditor = {} as any
      const s = new WasmSerializer(context, newKernel())
      // @ts-ignore readonly
      s['ready'] = Promise.resolve()
      expect(Buffer.from(await s.serializeNotebook({ cells: [] } as any, {} as any))).toEqual(
        Buffer.from('Hello World!'),
      )
    })
  })
})

describe('GrpcSerializer', () => {
  const deepCopyFixture = () => {
    const raw = fixtureMarshalNotebook as any
    return JSON.parse(JSON.stringify(raw))
  }

  describe('#isDocumentSessionOutputs', () => {
    it('should return false when frontmatter does not include a session ID', () => {
      const fixture = deepCopyFixture()
      const res = GrpcSerializer.isDocumentSessionOutputs(fixture.metadata)
      expect(res).toBeFalsy()
    })

    it('should return true when frontmatter does include a session ID', () => {
      const res = GrpcSerializer.isDocumentSessionOutputs({
        'runme.dev/frontmatterParsed': { runme: { session: { id: 'my-fake-session' } } },
      })
      expect(res).toBeTruthy()
    })
  })

  describe('#getDocumentLifecycleId', () => {
    it('should return the document lifecylce ID if present', () => {
      const fixture = deepCopyFixture()
      const res = GrpcSerializer.getDocumentLifecycleId(fixture.metadata)
      expect(res).toStrictEqual('01HF7B0KJPF469EG9ZWDNKKACQ')
    })

    it('should return undefined for documents without lifecylce IDs', () => {
      const fixture = deepCopyFixture()
      delete fixture.metadata['runme.dev/frontmatterParsed']?.['runme']

      const res = GrpcSerializer.getDocumentLifecycleId(fixture.metadata)
      expect(res).toBeUndefined()
    })
  })

  describe('cell execution summary marshaling', () => {
    it('should not misrepresenting uninitialized values', () => {
      // i.e. undefined is not sucess=false
      const execSummaryFixture = deepCopyFixture()
      expect(execSummaryFixture.cells.length).toBe(2)

      // set here since JSON does not represent "undefined" as vscode APIs do
      execSummaryFixture.cells[0].executionSummary = {
        success: undefined,
        timing: { startTime: undefined, endTime: undefined },
      }

      const notebookData = GrpcSerializer.marshalNotebook(execSummaryFixture)
      expect(notebookData.cells.length).toBe(2)
      expect(notebookData.cells[0].executionSummary).toBeUndefined()
    })

    it('should wrap raw values for protobuf', () => {
      const execSummaryFixture = deepCopyFixture()
      expect(execSummaryFixture.cells.length).toBe(2)

      const notebookData = GrpcSerializer.marshalNotebook(execSummaryFixture)
      expect(notebookData.cells.length).toBe(2)

      const summary = notebookData.cells[1].executionSummary
      expect(summary?.success).toBeDefined()
      expect(summary?.success?.value).toStrictEqual(false)

      expect(summary?.timing).toBeDefined()
      expect(summary?.timing?.startTime?.value).toStrictEqual('1701444499517')
      expect(summary?.timing?.endTime?.value).toStrictEqual('1701444501696')
    })
  })

  describe('cell outputs marshaling', () => {
    it('should backfill the output type for buffers', () => {
      const outputsFixture = deepCopyFixture()
      expect(outputsFixture.cells.length).toBe(2)

      const notebookData = GrpcSerializer.marshalNotebook(outputsFixture)
      expect(notebookData.cells.length).toBe(2)
      const cells = notebookData.cells[1]
      const items = cells.outputs[0].items
      expect(items.length).toBe(2)
      items.forEach((item) => {
        expect((item.data as any).type).toBe('Buffer')
        expect(item.mime).toBeDefined()
      })
      const { processInfo } = cells.outputs[0]
      expect(processInfo?.exitReason).toBeDefined()
      expect(processInfo?.exitReason?.type).toStrictEqual('exit')
      expect(processInfo?.exitReason?.code?.value).toStrictEqual(16)
      expect(processInfo?.pid).toBeDefined()
      expect(processInfo?.pid?.value).toStrictEqual('98354')
    })
  })

  describe('frontmatter handling', () => {
    it('should remove parse frontmatter on serialization', () => {
      const outputsFixture = deepCopyFixture()
      expect(outputsFixture.cells.length).toBe(2)
      expect(outputsFixture.metadata['runme.dev/frontmatterParsed']).toBeDefined()
      expect(Object.keys(outputsFixture.metadata).length).toStrictEqual(3)

      const notebookData = GrpcSerializer.marshalNotebook(outputsFixture)
      expect(notebookData.metadata['runme.dev/frontmatterParsed']).toBeUndefined()
      expect(Object.keys(notebookData.metadata).length).toStrictEqual(2)
    })
  })

  describe('session file', () => {
    const context: any = {
      extensionUri: { fsPath: '/foo/bar' },
    }

    const Server = vi.fn().mockImplementation(() => ({
      onTransportReady: vi.fn(),
      ready: vi.fn().mockResolvedValue(null),
    }))

    const Kernel = vi.fn().mockImplementation(() => ({
      hasExperimentEnabled: vi.fn().mockReturnValue(true),
      getRunnerEnvironment: vi.fn().mockImplementation(() => ({
        getSessionId: vi.fn().mockImplementation(() => 'FAKE-SESSION'),
      })),
    }))

    const fakeSrcDocUri = { fsPath: '/tmp/fake/source.md' } as any

    it("maps document lifecylce ids to source doc's URIs on notebook opening", async () => {
      const fixture = deepCopyFixture()
      const lid = fixture.metadata['runme.dev/frontmatterParsed'].runme.id

      const serializer: any = new GrpcSerializer(context, new Server(), new Kernel())
      serializer.outputPersistence = true

      vi.spyOn(GrpcSerializer, 'getOutputsUri').mockReturnValue(fakeSrcDocUri)

      await serializer.handleOpenNotebook({
        uri: fakeSrcDocUri,
        metadata: fixture.metadata,
      })

      const lidDocUri = serializer.lidDocUriMapping.get(lid)
      expect(lidDocUri).toStrictEqual(fakeSrcDocUri)
    })

    describe('#saveNotebookOutputs', () => {
      const fakeCachedBytes = new Uint8Array([1, 2, 3, 4])
      const serializer: any = new GrpcSerializer(context, new Server(), new Kernel())
      const toggleSessionButton = vi.fn()
      serializer.toggleSessionButton = toggleSessionButton

      it('skips if notebook has zero bytes', async () => {
        serializer.client = {
          serialize: vi.fn().mockResolvedValue({ response: { result: new Uint8Array([]) } }),
        }
        await serializer.handleSaveNotebookOutputs({
          uri: fakeSrcDocUri,
          metadata: {},
        })

        expect(toggleSessionButton).toBeCalledWith(false)
      })

      it('skips if uri mapping to lid is unknown', async () => {
        const fixture = deepCopyFixture()
        serializer.serializerCache.set(
          fixture.metadata['runme.dev/frontmatterParsed'].runme.id,
          fakeCachedBytes,
        )
        await serializer.handleSaveNotebookOutputs({
          uri: fakeSrcDocUri,
          metadata: fixture.metadata,
        })

        expect(toggleSessionButton).toBeCalledWith(false)
      })

      it('skips if session file mapping is unknown', async () => {
        const fixture = deepCopyFixture()
        serializer.lidDocUriMapping.set(
          fixture.metadata['runme.dev/frontmatterParsed'].runme.id,
          fakeSrcDocUri,
        )
        serializer.serializerCache.set(
          fixture.metadata['runme.dev/frontmatterParsed'].runme.id,
          fakeCachedBytes,
        )
        GrpcSerializer.getOutputsUri = vi.fn().mockImplementation(() => undefined)
        await serializer.handleSaveNotebookOutputs({
          uri: fakeSrcDocUri,
          metadata: fixture.metadata,
        })

        expect(toggleSessionButton).toBeCalledWith(false)
      })

      it('skips if runner env session in unknown', async () => {
        const fixture = deepCopyFixture()
        serializer.lidDocUriMapping.set(
          fixture.metadata['runme.dev/frontmatterParsed'].runme.id,
          fakeSrcDocUri,
        )
        serializer.serializerCache.set(
          fixture.metadata['runme.dev/frontmatterParsed'].runme.id,
          fakeCachedBytes,
        )
        serializer.kernel.getRunnerEnvironment = () => ({
          getSessionId: vi.fn().mockImplementation(() => undefined),
        })
        await serializer.handleSaveNotebookOutputs({
          uri: fakeSrcDocUri,
          metadata: fixture.metadata,
        })

        expect(toggleSessionButton).toBeCalledWith(false)
      })

      it('writes cached bytes to session file on serialization and save', async () => {
        const fixture = deepCopyFixture()
        const writeableSer: any = new GrpcSerializer(context, new Server(), new Kernel())
        writeableSer.outputPersistence = true
        writeableSer.client = {
          serialize: vi.fn().mockResolvedValue({ response: { result: fakeCachedBytes } }),
        }
        writeableSer.lidDocUriMapping.set(
          fixture.metadata['runme.dev/frontmatterParsed'].runme.id,
          fakeSrcDocUri,
        )
        GrpcSerializer.getOutputsUri = vi.fn().mockImplementation(() => fakeSrcDocUri)

        const result = await writeableSer.serializeNotebook(
          { cells: [], metadata: fixture.metadata } as any,
          new CancellationTokenSource().token,
        )
        expect(result.length).toStrictEqual(4)

        await writeableSer.handleSaveNotebookOutputs({
          uri: fakeSrcDocUri,
          metadata: fixture.metadata,
        })

        expect(workspace.fs.writeFile).toBeCalledWith(fakeSrcDocUri, fakeCachedBytes)
        expect(workspace.fs.writeFile).toHaveBeenCalledTimes(2)
      })
    })

    it('derives its path from notebook source document and session', () => {
      const outputFilePath = GrpcSerializer.getOutputsFilePath(
        '/tmp/fake/runbook.md',
        '01HGX8KYWM9K41YVYP0CNR3TZW',
      )
      expect(outputFilePath).toStrictEqual('/tmp/fake/runbook-01HGX8KYWM9K41YVYP0CNR3TZW.md')
    })

    it('should include session and document info on serialization', async () => {
      const context: any = {
        extensionUri: { fsPath: '/foo/bar' },
      }
      const fixture = {
        cells: [],
        metadata: {
          'runme.dev/finalLineBreaks': '1',
          'runme.dev/frontmatter':
            '---\nrunme:\n  id: 01HF7B0KJPF469EG9ZWDNKKACQ\n  version: v2.0\n---',
        },
      }

      const serialize = vi.fn().mockImplementation(() => ({
        response: {
          result: new Uint8Array([4, 3, 2, 1]),
        },
      }))
      const ser = new GrpcSerializer(context, new Server(), new Kernel())
      ;(ser as any).lidDocUriMapping = { get: vi.fn().mockReturnValue(fakeSrcDocUri) }
      ;(ser as any).client = { serialize }

      const output = await (ser as any).cacheNotebookOutputs(fixture, 'irrelevant')

      expect(output).toEqual(new Uint8Array([4, 3, 2, 1]))
      expect(serialize).toBeCalledWith({
        notebook: {
          cells: [],
          metadata: {
            'runme.dev/finalLineBreaks': '1',
            'runme.dev/frontmatter':
              '---\nrunme:\n  id: 01HF7B0KJPF469EG9ZWDNKKACQ\n  version: v2.0\n---',
          },
        },
        options: {
          outputs: {
            enabled: true,
            summary: true,
          },
          session: {
            document: {
              relativePath: 'source.md',
            },
            id: 'FAKE-SESSION',
          },
        },
      })
    })
  })
})
