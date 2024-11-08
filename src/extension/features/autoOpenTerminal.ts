import { commands } from 'vscode'

import { FeatureName } from '../../types'

import { isOnInContextState } from '.'

export async function autoOpenTerminal() {
  if (!isOnInContextState(FeatureName.AutoOpenTerminal)) {
    return
  }

  await commands.executeCommand('workbench.action.terminal.new')
}
