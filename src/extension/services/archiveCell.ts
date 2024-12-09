import { TelemetryReporter } from 'vscode-telemetry'

import { InitializeCloudClient } from '../api/client'
import { ArchiveCellOutputDocument } from '../__generated-platform__/graphql'

export default async function archiveCell(cellId: string): Promise<void | boolean> {
  try {
    const graphClient = await InitializeCloudClient()
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
