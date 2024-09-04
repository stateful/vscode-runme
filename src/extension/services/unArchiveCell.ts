import { TelemetryReporter } from 'vscode-telemetry'

import { InitializeClient } from '../api/client'
import { resolveAuthToken } from '../utils'
import { UnArchiveCellOutputDocument } from '../__generated-platform__/graphql'

export default async function unArchiveCell(cellId: string): Promise<void | boolean> {
  try {
    const token = await resolveAuthToken()
    const graphClient = InitializeClient({ runmeToken: token })
    await graphClient.mutate({
      mutation: UnArchiveCellOutputDocument,
      variables: {
        id: cellId,
      },
    })
    TelemetryReporter.sendTelemetryEvent('app.unArchiveCell')
  } catch (error) {
    TelemetryReporter.sendTelemetryEvent('app.error')
    throw error
  }
}
