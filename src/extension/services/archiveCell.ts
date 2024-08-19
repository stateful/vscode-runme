import { TelemetryReporter } from 'vscode-telemetry'

import { InitializeClient } from '../api/client'
import { resolveAuthToken } from '../utils'
import { ArchiveCellExecutionDocument } from '../__generated-platform__/graphql'

export default async function archiveCell(cellId: string): Promise<void | boolean> {
  try {
    const token = await resolveAuthToken()
    const graphClient = InitializeClient({ runmeToken: token })
    await graphClient.mutate({
      mutation: ArchiveCellExecutionDocument,
      variables: {
        archiveCellExecutionId: cellId,
      },
    })
    TelemetryReporter.sendTelemetryEvent('app.archiveCell')
  } catch (error) {
    TelemetryReporter.sendTelemetryEvent('app.error')
    throw error
  }
}
