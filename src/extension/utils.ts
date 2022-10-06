import vscode from 'vscode'

const ENV_VAR_REGEXP = /(\$\w+)/g

export function isInteractiveTask (cell: vscode.NotebookCell) {
  const config = vscode.workspace.getConfiguration('runme')
  const configSetting = config.get<boolean>('shell.interactive', true)

  /**
   * if cell is marked as interactive (default: not set or set to 'true')
   */
  if (cell.metadata?.attributes && cell.metadata.attributes.interactive === 'true') {
    return true
  }

  return configSetting
}

export function getTerminalByCell (cell: vscode.NotebookCell) {
  return vscode.window.terminals.find((t) => {
    const taskEnv = (t.creationOptions as vscode.TerminalOptions).env || {}
    return taskEnv.RUNME_ID === `${cell.document.fileName}:${cell.index}`
  })
}

export function populateEnvVar (value: string, env = process.env) {
  for (const m of value.match(ENV_VAR_REGEXP) || []) {
    const envVar = m.slice(1) // slice out '$'
    value = value.replace(m, env[envVar] || '')
  }

  return value
}
