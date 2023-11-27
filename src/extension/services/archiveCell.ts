import { TelemetryReporter } from 'vscode-telemetry'

import { InitializeClient } from '../api/client'
import { getAuthSession } from '../utils'
import { ArchiveCellExecutionDocument } from '../__generated__/graphql'

import { RunmeService } from './runme'

export default async function archiveCell(cellId: string): Promise<void | boolean> {
  try {
    const session = await getAuthSession()

    if (!session) {
      throw new Error('You must authenticate with your GitHub account')
    }

    const runmeService = new RunmeService({ githubAccessToken: session.accessToken })
    const runmeTokenResponse = await runmeService.getUserToken()
    if (!runmeTokenResponse) {
      throw new Error('Unable to retrieve an access token')
    }
    const graphClient = InitializeClient({ runmeToken: runmeTokenResponse.token })
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
