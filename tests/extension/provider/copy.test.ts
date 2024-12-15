import { vi, test, expect } from 'vitest'
import { NotebookCellStatusBarAlignment } from 'vscode'

import { CopyStatusBarItem } from '../../../src/extension/provider/cellStatusBar/items/copy'
import { Kernel } from '../../../src/extension/kernel'

vi.mock('vscode-telemetry')
vi.mock('vscode')

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
