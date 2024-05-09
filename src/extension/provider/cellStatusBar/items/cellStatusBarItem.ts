import { NotebookCell, NotebookCellStatusBarItem } from 'vscode'

import { Kernel } from '../../../kernel'

export default abstract class CellStatusBarItem {
  protected cell: NotebookCell | undefined
  constructor(protected readonly kernel: Kernel) {}
  abstract getStatusBarItem(cell?: NotebookCell | undefined): NotebookCellStatusBarItem | undefined
  abstract registerCommands(): void
}
