import type { ExtensionContext } from 'vscode'
import { TelemetryReporter } from 'vscode-telemetry'

import { RunmeExtension } from './extension'

declare const INSTRUMENTATION_KEY: string

const ext = new RunmeExtension()

export async function activate (context: ExtensionContext) {
  TelemetryReporter.configure(context, INSTRUMENTATION_KEY)
  console.log('[Runme] Activating Extension')
  try {
    await ext.initialize(context)
    console.log('[Runme] Extension successfully activated')
  } catch (err: any) {
    console.log(`[Runme] Failed to initialize the extension: ${err.message}`)
  }

  TelemetryReporter.sendTelemetryEvent('activate')
}

export function deactivate () {
  console.log('[Runme] Deactivating Extension')
  TelemetryReporter.sendTelemetryEvent('deactivate')
}
