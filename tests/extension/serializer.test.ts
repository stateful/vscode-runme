import { NotebookDocument, NotebookEdit, window, workspace } from 'vscode'
import { expect, vi, it, describe, beforeEach } from 'vitest'

import { WasmSerializer } from '../../src/extension/serializer'
import { canEditFile } from '../../src/extension/utils'
import type { Kernel } from '../../src/extension/kernel'
import { EventEmitter, Uri } from '../../__mocks__/vscode'

globalThis.Go = vi.fn()
globalThis.Runme = { serialize: vi.fn().mockResolvedValue('Hello World!') }

vi.mock('../../src/extension/grpc/client', () => ({
    ParserServiceClient: vi.fn(),
}))

vi.mock('vscode', () => ({
    window: {
        activeNotebookEditor: undefined,
        showErrorMessage: vi.fn().mockResolvedValue({})
    },
    Uri: { joinPath: vi.fn().mockReturnValue('/foo/bar') },
    workspace: {
        fs: { readFile: vi.fn().mockResolvedValue({}) },
        onDidChangeNotebookDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidSaveNotebookDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        applyEdit: vi.fn(),
    },
    commands: { executeCommand: vi.fn() },
    WorkspaceEdit: Map<Uri, NotebookEdit[]>,
    NotebookEdit: {
      updateCellMetadata: (i: number, metadata: any) => ({ i, metadata, type: 'updateCellMetadata' }),
    },
    CancellationTokenSource: vi.fn(),
}))

vi.mock('../../src/extension/utils', () => ({
    canEditFile: vi.fn().mockResolvedValue(false),
    initWasm: vi.fn()
}))

function newKernel(): Kernel {
  return { } as unknown as Kernel
}

describe('SerializerBase', () => {
  const context: any = {
    extensionUri: { fsPath: '/foo/bar' }
  }

  describe('handleNotebookSaved', () => {
    const _onDidSaveNotebookDocument = new EventEmitter<NotebookDocument>()

    beforeEach(() => {
      vi.mocked(workspace.onDidSaveNotebookDocument).mockImplementation(l => _onDidSaveNotebookDocument.event(l))

      vi.mocked(workspace.applyEdit).mockClear()
    })

    it('updates cell names on save', async () => {
      const s = new WasmSerializer(context, newKernel())

      s['deserializeNotebook'] = vi.fn(() => ({
        cells: [
          {
            metadata: {
              'runme.dev/name': 'newName',
              'interactive': true,
            }
          }
        ],
      }) as any)

      const uri = Uri.file('/foo/bar')

      await _onDidSaveNotebookDocument.fireAsync({
        uri,
        cellAt: () => ({ metadata: { 'runme.dev/name': 'oldName', 'interactive': false }}),
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
        extensionUri: { fsPath: '/foo/bar' }
    }

    describe('serializeNotebook', () => {
        it('fails when notebook is not active', async () => {
            const s = new WasmSerializer(context, newKernel())
            await expect(() => s.serializeNotebook({} as any, {} as any))
                .rejects.toThrow(/not active/)
        })

        it('prevents saving if canEditFile returns false', async () => {
            // @ts-ignore readonly
            window.activeNotebookEditor = {} as any
            const s = new WasmSerializer(context, newKernel())
            await expect(() => s.serializeNotebook({} as any, {} as any))
                .rejects.toThrow(/saving non version controlled notebooks is disabled/)
        })

        it('throws if wasm fails to laod', async () => {
            // @ts-ignore readonly
            window.activeNotebookEditor = {} as any
            vi.mocked(canEditFile).mockResolvedValue(true)
            const s = new WasmSerializer(context, newKernel())
            // @ts-ignore readonly
            s['ready'] = Promise.reject('ups')
            await expect(() => s.serializeNotebook({} as any, {} as any)).rejects.toThrow(/ups/)
        })

        it('uses Runme wasm to save the file', async () => {
            // @ts-ignore readonly
            window.activeNotebookEditor = {} as any
            vi.mocked(canEditFile).mockResolvedValue(true)
            const s = new WasmSerializer(context, newKernel())
            // @ts-ignore readonly
            s['ready'] = Promise.resolve()
            expect(Buffer.from(await s.serializeNotebook({} as any, {} as any)))
                .toEqual(Buffer.from('Hello World!'))
        })
    })
})
