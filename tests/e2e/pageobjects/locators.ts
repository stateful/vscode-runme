export const runmeNotebook = {
  codeCell: '.code-cell-row',
}

export const notebookCell = {
  row: '.cell-editor-container',
  // container: '.code-cell-row',
  runButton: '.run-button-container',
  // status: '.cell-status-item',
  statusBar: '.cell-statusbar-container',
}

export const notebookCellStatus = {
  success: '.codicon-notebook-state-success',
  failure: '.codicon-notebook-state-error',
  item: '.cell-status-item',
  command: '.cell-status-item-has-command',
}

export const webview = {
  widget: (name: string) => `div[aria-label="${name}-widget"]`,
  outerFrame: '.webview.ready',
  innerFrame: '#active-frame',
}
