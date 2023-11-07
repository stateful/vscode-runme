import { vi, test, expect } from 'vitest'

import { CopyProvider } from '../../../src/extension/provider/copy'

vi.mock('vscode', () => ({
  default: {
    NotebookCellStatusBarItem: class {
      constructor(
        public label: string,
        public position: number,
      ) {}
    },
    NotebookCellStatusBarAlignment: {
      Right: 'right',
    },
  },
}))

test('dont show pid if cell is non interactive', async () => {
  const p = new CopyProvider()
  const item = await p.provideCellStatusBarItems()
  expect(item).toEqual({
    label: '$(copy) Copy',
    position: 'right',
    command: 'runme.copyCellToClipboard',
  })
})
