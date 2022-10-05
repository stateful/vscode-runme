import vscode from 'vscode'

export function isInteractiveTask (cell: vscode.NotebookCell) {
  const config = vscode.workspace.getConfiguration('runme')

  /**
   * if cell is marked as interactive (default: not set or set to 'true')
   */
  if (
    typeof cell.metadata.attributes?.interactive === 'undefined' ||
    cell.metadata.attributes.interactive === 'true'
  ) {
    return true
  }

  /**
   * if it is set within the settings (default: true)
   */
  if (config.get('shell.interactive')) {
    return true
  }

  return false
}

export function getTerminalByCell (cell: vscode.NotebookCell) {
  return vscode.window.terminals.find((t) => {
    const taskEnv = (t.creationOptions as vscode.TerminalOptions).env || {}
    return taskEnv.RUNME_ID === `${cell.document.fileName}:${cell.index}`
  })
}
