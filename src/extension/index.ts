import type { ExtensionContext } from 'vscode'
import { TelemetryReporter } from 'vscode-telemetry'

import { RunmeExtension } from './extension'
import getLogger from './logger'

declare const INSTRUMENTATION_KEY: string

const ext = new RunmeExtension()
const log = getLogger()

export async function activate (context: ExtensionContext) {
  TelemetryReporter.configure(context, INSTRUMENTATION_KEY)
  log.info('Activating Extension')
  try {
    await ext.initialize(context)
    log.info('Extension successfully activated')
  } catch (err: any) {
    log.error(`Failed to initialize the extension: ${err.message}`)
  }

  TelemetryReporter.sendTelemetryEvent('activate')
}

export function deactivate () {
  log.info('Deactivating Extension')
  TelemetryReporter.sendTelemetryEvent('deactivate')
}
