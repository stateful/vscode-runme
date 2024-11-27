import { commands } from 'vscode'

import { FeatureName } from '../../types'
import ContextState from '../contextState'

import { isOnInContextState } from '.'

export async function autoOpenTerminal() {
  if (!isOnInContextState(FeatureName.OpenTerminalOnStartup)) {
    return
  }

  if (!ContextState.getKey<boolean>(`${FeatureName.OpenTerminalOnStartup}.autoOpenTerminal`)) {
    await commands.executeCommand('workbench.action.terminal.new')
    await ContextState.addKey(`${FeatureName.OpenTerminalOnStartup}.autoOpenTerminal`, true)
  }
}
