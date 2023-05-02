import { window } from 'vscode'
import { expect, vi, it, describe } from 'vitest'

import { WasmSerializer } from '../../src/extension/serializer'
import { canEditFile } from '../../src/extension/utils'
import type { Kernel } from '../../src/extension/kernel'

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
        fs: { readFile: vi.fn().mockReturnValue(new Promise(() => {})) },
        onDidChangeNotebookDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidSaveNotebookDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    },
    commands: { executeCommand: vi.fn() }
}))

vi.mock('../../src/extension/utils', () => ({
    canEditFile: vi.fn().mockResolvedValue(false),
    initWasm: vi.fn()
}))

function newKernel(): Kernel {
  return {
    registerSerializer: vi.fn(),
  } as unknown as Kernel
}

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
