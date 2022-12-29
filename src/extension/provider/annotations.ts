import vscode from 'vscode'

export class AnnotationsProvider implements vscode.NotebookCellStatusBarItemProvider {
  async provideCellStatusBarItems(): Promise<vscode.NotebookCellStatusBarItem | undefined> {
    const item = new vscode.NotebookCellStatusBarItem(
      '$(gear) Annotations',
      vscode.NotebookCellStatusBarAlignment.Right
    )
    item.command = 'runme.openAnnotationsQuickPick'
    return item
  }
}
