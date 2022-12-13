import type { ExtensionContext } from 'vscode'

import { RunmeExtension } from './extension'

const ext = new RunmeExtension()

export async function activate (context: ExtensionContext) {
  console.log('[Runme] Activating Extension')
  try {
    await ext.initialize(context)
    console.log('[Runme] Extension successfully activated')
  } catch (err: any) {
    console.log(`[Runme] Failed to initialize the extension ${err.message}`)
  }
}

export function deactivate () {
  console.log('[Runme] Deactivating Extension')
}
