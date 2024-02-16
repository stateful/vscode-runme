import { vi, suite, test, expect, beforeEach } from 'vitest'

import { getAnnotations } from '../../../src/extension/utils'
import { NamedProvider } from '../../../src/extension/provider/named'

vi.mock('vscode')

vi.mock('../../../src/extension/utils', () => ({
  getAnnotations: vi.fn(),
}))

suite('NamedProvider', () => {
  beforeEach(() => {
    vi.mocked(getAnnotations).mockClear()
  })

  test('ignore markdown cells', async () => {
    const p = new NamedProvider()
    const item = await p.provideCellStatusBarItems({ kind: 1 } as any)
    expect(item).toBeUndefined()
  })

  test('suggest to Add Name if name is generated and unchanged', async () => {
    vi.mocked(getAnnotations).mockReturnValueOnce({
      name: 'echo-hello',
      'runme.dev/name': 'echo-hello',
      'runme.dev/nameGenerated': true,
    } as any)
    const p = new NamedProvider()
    const item = await p.provideCellStatusBarItems({ kind: 2 } as any)
    // eslint-disable-next-line quotes
    expect(item?.text).toMatchInlineSnapshot(`"$(add) Add Name"`)
    expect(item?.tooltip).toMatchInlineSnapshot(
      // eslint-disable-next-line quotes
      `"Add name to important cells"`,
    )
    expect(getAnnotations).toBeCalledTimes(1)
  })

  test('offer changing name if name is not generated', async () => {
    vi.mocked(getAnnotations).mockReturnValueOnce({
      name: 'say-hello',
      'runme.dev/name': 'echo-hello',
      'runme.dev/nameGenerated': true,
    } as any)
    const p = new NamedProvider()
    const item = await p.provideCellStatusBarItems({ kind: 2 } as any)
    // eslint-disable-next-line quotes
    expect(item?.text).toMatchInlineSnapshot(`"$(file-symlink-file) say-hello"`)
    expect(item?.tooltip).toMatchInlineSnapshot(
      // eslint-disable-next-line quotes
      `"Be careful changing the name of an important cell"`,
    )
    expect(getAnnotations).toBeCalledTimes(1)
  })
})
