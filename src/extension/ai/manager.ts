import * as vscode from 'vscode'

import * as ghost from './ghost'

// AIManager is a class that manages the AI services.
export class AIManager {
  constructor(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('runme.experiments')
    const autoComplete = config.get<boolean>('aiAutoCell', false)

    if (autoComplete) {
      ghost.registerGhostCellEvents(context)
    }
  }
}
