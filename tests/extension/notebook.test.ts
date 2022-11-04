import { test, expect, vi, beforeEach, afterEach } from 'vitest'

import { Serializer } from '../../src/extension/notebook.js'

vi.mock('vscode')

const webAssemblyInstantiateOrig = WebAssembly.instantiate.bind(WebAssembly)
beforeEach(() => {
  WebAssembly.instantiate = vi.fn() as any
})

test('should show error', async () => {
  globalThis.Go = class {}
  globalThis.GetDocument = vi.fn()
  vi.mocked(WebAssembly.instantiate).mockRejectedValue(new Error('ups'))
  const context: any = { extensionUri: { fsPath: '/foo/bar' } }
  const serializer = new Serializer(context)
  const cells = await serializer.deserializeNotebook(new Uint8Array())
  expect(cells).toMatchSnapshot()
})

test('should encourage to edit cell when none was found', async () => {
  globalThis.Go = class { run () {} }
  globalThis.GetDocument = vi.fn().mockReturnValue({})
  vi.mocked(WebAssembly.instantiate).mockResolvedValue({ run: vi.fn() } as any)
  const context: any = { extensionUri: { fsPath: '/foo/bar' } }
  const serializer = new Serializer(context)
  const cells = await serializer.deserializeNotebook(new Uint8Array())
  expect(cells).toMatchSnapshot()
})

afterEach(() => {
  WebAssembly.instantiate = webAssemblyInstantiateOrig
})
