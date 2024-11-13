import { commands } from 'vscode'

import { FeatureName } from '../../types'
import ContextState from '../contextState'

import { isOnInContextState } from '.'

export async function autoOpenTerminal() {
  if (!isOnInContextState(FeatureName.HostedPlayground)) {
    return
  }

  if (!ContextState.getKey<boolean>(`${FeatureName.HostedPlayground}.autoOpenTerminal`)) {
    await commands.executeCommand('workbench.action.terminal.new')
    await ContextState.addKey(`${FeatureName.HostedPlayground}.autoOpenTerminal`, true)
  }
}
