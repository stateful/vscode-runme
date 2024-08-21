import { TelemetryReporter } from 'vscode-telemetry'

import { InitializeClient } from '../api/client'
import { resolveAuthToken } from '../utils'
import { ArchiveCellOutputDocument } from '../__generated-platform__/graphql'

export default async function archiveCell(cellId: string): Promise<void | boolean> {
  try {
    const token = await resolveAuthToken()
    const graphClient = InitializeClient({ runmeToken: token })
    await graphClient.mutate({
      mutation: ArchiveCellOutputDocument,
      variables: {
        id: cellId,
      },
    })
    TelemetryReporter.sendTelemetryEvent('app.archiveCell')
  } catch (error) {
    TelemetryReporter.sendTelemetryEvent('app.error')
    throw error
  }
}
