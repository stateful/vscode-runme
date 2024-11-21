import { TelemetryReporter } from 'vscode-telemetry'

import { ClientMessages } from '../../../constants'
import { ClientMessage, IApiMessage } from '../../../types'
import { InitializeCloudClient } from '../../api/client'
import { postClientMessage } from '../../../utils/messaging'
import { CreateEscalationDocument, EscalationStatus } from '../../__generated-platform__/graphql'
import { Kernel } from '../../kernel'
import getLogger from '../../logger'

type APIRequestMessage = IApiMessage<ClientMessage<ClientMessages.platformApiRequest>>

const log = getLogger('CreateEscalation')

export default async function createEscalation(
  requestMessage: APIRequestMessage,
  _kernel: Kernel,
): Promise<void | boolean> {
  const { messaging, message } = requestMessage
  log.info('Creating escalation', message.output.data.id)

  try {
    const graphClient = await InitializeCloudClient()
    const result = await graphClient.mutate({
      mutation: CreateEscalationDocument,
      variables: {
        input: {
          cellOutputId: message.output.data.id,
          status: EscalationStatus.Open,
        },
      },
    })
    log.info('Escalation created', message.output.data.id)

    TelemetryReporter.sendTelemetryEvent('app.escalate')
    return postClientMessage(messaging, ClientMessages.platformApiResponse, {
      data: result,
      id: message.output.id,
    })
  } catch (error) {
    log.error('Error escalating cell execution', message.output.data.id, (error as Error).message)
    TelemetryReporter.sendTelemetryEvent('app.escalate.error')
    return postClientMessage(messaging, ClientMessages.platformApiResponse, {
      data: (error as any).message,
      id: message.output.id,
      hasErrors: true,
    })
  }
}
