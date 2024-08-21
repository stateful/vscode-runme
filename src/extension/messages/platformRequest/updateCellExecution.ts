import { TelemetryReporter } from 'vscode-telemetry'

import { ClientMessages } from '../../../constants'
import { ClientMessage, IApiMessage } from '../../../types'
import { InitializeClient } from '../../api/client'
import { getPlatformAuthSession } from '../../utils'
import { postClientMessage } from '../../../utils/messaging'
import { ShareType, UpdateCellOutputDocument } from '../../__generated-platform__/graphql'
import { Kernel } from '../../kernel'
import getLogger from '../../logger'

type APIRequestMessage = IApiMessage<ClientMessage<ClientMessages.platformApiRequest>>

const log = getLogger('UpdateCell')

export default async function updateCellExecution(
  requestMessage: APIRequestMessage,
  kernel: Kernel,
): Promise<void | boolean> {
  const { messaging, message } = requestMessage
  log.info('Updating cell execution', message.output.data.id)

  const escalationButton = kernel.hasExperimentEnabled('escalationButton', false)!
  log.info(`escalationButton: ${escalationButton ? 'enabled' : 'disabled'}`, message.output.data.id)

  try {
    const session = await getPlatformAuthSession()

    if (!session) {
      throw new Error('You must authenticate with your Stateful account')
    }

    const graphClient = InitializeClient({ runmeToken: session.accessToken })
    const result = await graphClient.mutate({
      mutation: UpdateCellOutputDocument,
      variables: {
        id: message.output.data.id,
        input: {
          shareType: ShareType.Organization,
          notify: true, // Always share to Slack, regardless if there's or not an error in the cell
        },
      },
    })
    log.info('Cell execution updated', message.output.data.id)

    const showEscalationButton = !!result.data?.updateCellOutput?.isSlackReady
    log.info(
      `showEscalationButton: ${showEscalationButton ? 'enabled' : 'disabled'}`,
      message.output.data.id,
    )

    TelemetryReporter.sendTelemetryEvent('app.update')
    return postClientMessage(messaging, ClientMessages.platformApiResponse, {
      data: result,
      id: message.output.id,
      escalationButton: showEscalationButton,
    })
  } catch (error) {
    log.error('Error updating cell execution', message.output.data.id, (error as Error).message)
    TelemetryReporter.sendTelemetryEvent('app.update.error')
    return postClientMessage(messaging, ClientMessages.platformApiResponse, {
      data: (error as any).message,
      id: message.output.id,
      escalationButton,
      hasErrors: true,
    })
  }
}
