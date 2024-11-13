import { TelemetryReporter } from 'vscode-telemetry'

import { ClientMessages } from '../../../constants'
import { ClientMessage, IApiMessage } from '../../../types'
import { InitializeClient } from '../../api/client'
import { getPlatformAuthSession } from '../../utils'
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
    const session = await getPlatformAuthSession()

    if (!session) {
      throw new Error('You must authenticate with your Stateful account')
    }

    const graphClient = InitializeClient({ runmeToken: session.accessToken })

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

    TelemetryReporter.sendTelemetryEvent('app.runmeEvent')
  } catch (error) {
    log.error('Error tracking runme event', (error as Error).message)
    TelemetryReporter.sendTelemetryEvent('app.runmeEvent.error')
  }
}
