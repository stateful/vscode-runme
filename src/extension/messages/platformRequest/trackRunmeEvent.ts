import { TelemetryReporter } from 'vscode-telemetry'

import { ClientMessages } from '../../../constants'
import { ClientMessage, IApiMessage } from '../../../types'
import { InitializeCloudClient } from '../../api/client'
import {
  RunmeEventInput,
  RunmeEventInputType,
  TrackRunmeEventDocument,
} from '../../__generated-platform__/graphql'
import { Kernel } from '../../kernel'
import getLogger from '../../logger'

type APIRunmeEvent = IApiMessage<ClientMessage<ClientMessages.platformApiRequest>>

const log = getLogger('TrackRunmeEvent')

export default async function trackRunmeEvent(
  requestMessage: APIRunmeEvent,
  _kernel: Kernel,
): Promise<void | boolean> {
  const { message } = requestMessage
  log.info('Sending Runme event')

  try {
    const graphClient = await InitializeCloudClient()

    let input: RunmeEventInput | null = null

    switch (message.output.data.type) {
      case RunmeEventInputType.RunCell:
        input = {
          data: {
            runCellData: {
              cell: {
                id: message.output.data.cell.id,
              },
              notebook: {
                id: message.output.data.notebook.id,
                path: message.output.data.notebook.path,
              },
              executionSummary: {
                success: message.output.data.executionSummary.success,
                timing: message.output.data.executionSummary.timing,
              },
            },
          },
          type: message.output.data.type,
        }
        break
    }

    if (!input) {
      log.warn('No input data for Runme event')
      return
    }

    await graphClient.mutate({
      mutation: TrackRunmeEventDocument,
      variables: {
        input,
      },
    })
    log.info('Runme event sent')

    TelemetryReporter.sendTelemetryEvent('app.trackRunmeEvent')
  } catch (error) {
    log.error('Error tracking runme event', (error as Error).message)
    TelemetryReporter.sendTelemetryEvent('app.trackRunmeEvent.error')
  }
}
