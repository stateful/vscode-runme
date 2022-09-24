import vscode from 'vscode'

export class ThumbsUpProvider implements vscode.NotebookCellStatusBarItemProvider {
  provideCellStatusBarItems(
    cell: vscode.NotebookCell
  ): vscode.NotebookCellStatusBarItem | undefined {
    const ran = <boolean | undefined>cell.outputs[0]?.metadata?.["ran"]
    if (typeof ran !== "boolean" || ran === false) {
      return
    }
    const item = new vscode.NotebookCellStatusBarItem(
      `👍`,
      vscode.NotebookCellStatusBarAlignment.Right
    )
    item.command = "marquee.open"
    item.tooltip = `This worked great`
    return item
  }
}

export class ThumbsDownProvider
  implements vscode.NotebookCellStatusBarItemProvider {
  provideCellStatusBarItems(
    cell: vscode.NotebookCell
  ): vscode.NotebookCellStatusBarItem | undefined {
    const ran = <boolean | undefined>cell.outputs[0]?.metadata?.["ran"]
    if (typeof ran !== "boolean" || ran === false) {
      return
    }
    const item = new vscode.NotebookCellStatusBarItem(
      `👎`,
      vscode.NotebookCellStatusBarAlignment.Right
    )
    item.command = "marquee.open"
    item.tooltip = `Didn't work`
    return item
  }
}
