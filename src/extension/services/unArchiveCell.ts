import { TelemetryReporter } from 'vscode-telemetry'

import { InitializeCloudClient } from '../api/client'
import { UnArchiveCellOutputDocument } from '../__generated-platform__/graphql'

export default async function unArchiveCell(cellId: string): Promise<void | boolean> {
  try {
    const graphClient = await InitializeCloudClient()
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
