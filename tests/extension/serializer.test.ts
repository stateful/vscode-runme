import { window } from 'vscode'
import { expect, vi, it, describe } from 'vitest'

import { Serializer } from '../../src/extension/serializer'
import { canEditFile } from '../../src/extension/utils'

globalThis.Go = vi.fn()
globalThis.Runme = { serialize: vi.fn().mockResolvedValue('Hello World!') }

vi.mock('vscode', () => ({
    window: {
        activeNotebookEditor: undefined,
        showErrorMessage: vi.fn().mockResolvedValue({})
    },
    Uri: { joinPath: vi.fn().mockReturnValue('/foo/bar') },
    workspace: {
        fs: { readFile: vi.fn().mockReturnValue(new Promise(() => {})) }
    },
    commands: { executeCommand: vi.fn() }
}))

vi.mock('../../src/extension/utils', () => ({
    canEditFile: vi.fn().mockResolvedValue(false)
}))

describe('Serializer', () => {
    const context: any = {
        extensionUri: { fsPath: '/foo/bar' }
    }

    describe('serializeNotebook', () => {
        it('fails when notebook is not active', async () => {
            const s = new Serializer(context)
            await expect(() => s.serializeNotebook({} as any, {} as any))
                .rejects.toThrow(/not active/)
        })

        it('prevents saving if canEditFile returns false', async () => {
            // @ts-ignore readonly
            window.activeNotebookEditor = {} as any
            const s = new Serializer(context)
            await expect(() => s.serializeNotebook({} as any, {} as any))
                .rejects.toThrow(/disabled during beta phase/)
        })

        it('throws if wasm fails to laod', async () => {
            // @ts-ignore readonly
            window.activeNotebookEditor = {} as any
            vi.mocked(canEditFile).mockResolvedValue(true)
            const s = new Serializer(context)
            // @ts-ignore readonly
            s['wasmReady'] = Promise.reject('ups')
            await expect(() => s.serializeNotebook({} as any, {} as any)).rejects.toThrow(/ups/)
        })

        it('uses Runme wasm to save the file', async () => {
            // @ts-ignore readonly
            window.activeNotebookEditor = {} as any
            vi.mocked(canEditFile).mockResolvedValue(true)
            const s = new Serializer(context)
            // @ts-ignore readonly
            s['wasmReady'] = Promise.resolve()
            expect(Buffer.from(await s.serializeNotebook({} as any, {} as any)))
                .toEqual(Buffer.from('Hello World!'))
        })
    })
})
