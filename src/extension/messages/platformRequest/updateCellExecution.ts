import { TelemetryReporter } from 'vscode-telemetry'

import { ClientMessages } from '../../../constants'
import { ClientMessage, IApiMessage } from '../../../types'
import { InitializeCloudClient } from '../../api/client'
import { postClientMessage } from '../../../utils/messaging'
import { ShareType, UpdateCellOutputDocument } from '../../__generated-platform__/graphql'
import { Kernel } from '../../kernel'
import getLogger from '../../logger'

type APIRequestMessage = IApiMessage<ClientMessage<ClientMessages.platformApiRequest>>

const log = getLogger('UpdateCell')

export default async function updateCellExecution(
  requestMessage: APIRequestMessage,
  _kernel: Kernel,
): Promise<void | boolean> {
  const { messaging, message } = requestMessage
  log.info('Updating cell execution', message.output.data.id)

  try {
    const graphClient = await InitializeCloudClient()
    const result = await graphClient.mutate({
      mutation: UpdateCellOutputDocument,
      variables: {
        id: message.output.data.id,
        input: {
          shareType: ShareType.Organization,
          notify: true, // Always share to Slack, regardless if the cell exists with an error code or not
        },
      },
    })
    log.info('Cell execution updated', message.output.data.id)

    TelemetryReporter.sendTelemetryEvent('app.update')
    return postClientMessage(messaging, ClientMessages.platformApiResponse, {
      data: result,
      id: message.output.id,
    })
  } catch (error) {
    log.error('Error updating cell execution', message.output.data.id, (error as Error).message)
    TelemetryReporter.sendTelemetryEvent('app.update.error')
    return postClientMessage(messaging, ClientMessages.platformApiResponse, {
      data: (error as any).message,
      id: message.output.id,
      hasErrors: true,
    })
  }
}
