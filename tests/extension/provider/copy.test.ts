import { vi, test, expect } from 'vitest'
import { ExtensionContext, NotebookCellStatusBarAlignment, Uri } from 'vscode'

import { CopyStatusBarItem } from '../../../src/extension/provider/cellStatusBar/items/copy'
import { Kernel } from '../../../src/extension/kernel'
import { StatefulAuthProvider } from '../../../src/extension/provider/statefulAuth'

vi.mock('vscode-telemetry')
vi.mock('vscode')

const contextFake: ExtensionContext = {
  extensionUri: Uri.parse('file:///Users/fakeUser/projects/vscode-runme'),
  secrets: {
    store: vi.fn(),
  },
  subscriptions: [],
} as any

StatefulAuthProvider.initialize(contextFake)

test('NotebookCellStatusBarAlignment test suite', () => {
  const kernel = new Kernel({} as any)
  const p = new CopyStatusBarItem(kernel)
  const item = p.getStatusBarItem()
  expect(item).toEqual({
    label: '$(copy) Copy',
    alignment: NotebookCellStatusBarAlignment.Right,
    command: 'runme.copyCellToClipboard',
  })
})
