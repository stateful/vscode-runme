import { TelemetryReporter } from 'vscode-telemetry'

import { ClientMessages } from '../../../constants'
import { ClientMessage, IApiMessage } from '../../../types'
import { InitializeClient } from '../../api/client'
import { getCellById } from '../../cell'
import { getCellRunmeId, getPlatformAuthSession } from '../../utils'
import { postClientMessage } from '../../../utils/messaging'
import { UpdateCellExecutionDocument } from '../../__generated-platform__/graphql'
import { Kernel } from '../../kernel'

type APIRequestMessage = IApiMessage<ClientMessage<ClientMessages.platformApiRequest>>

export default async function updateCellExecution(
  requestMessage: APIRequestMessage,
  kernel: Kernel,
): Promise<void | boolean> {
  const { messaging, message, editor } = requestMessage

  const escalationButton = kernel.hasExperimentEnabled('escalationButton', false)!

  try {
    const session = await getPlatformAuthSession()

    if (!session) {
      throw new Error('You must authenticate with your Stateful account')
    }
    const cell = await getCellById({ editor, id: message.output.id })
    if (!cell) {
      throw new Error('Cell not found')
    }

    const runmeId = getCellRunmeId(cell)
    const terminal = kernel.getTerminal(runmeId)
    if (!terminal) {
      throw new Error('Could not find an associated terminal')
    }

    const graphClient = InitializeClient({ runmeToken: session.accessToken })
    const result = await graphClient.mutate({
      mutation: UpdateCellExecutionDocument,
      variables: {
        id: message.output.data.id,
        input: {
          isPrivate: false,
        },
      },
    })
    const showEscalationButton = !!result.data?.updateCellExecution.isSlackReady

    TelemetryReporter.sendTelemetryEvent('app.update')
    return postClientMessage(messaging, ClientMessages.platformApiResponse, {
      data: result,
      id: message.output.id,
      escalationButton: showEscalationButton,
    })
  } catch (error) {
    TelemetryReporter.sendTelemetryEvent('app.update.error')
    return postClientMessage(messaging, ClientMessages.platformApiResponse, {
      data: (error as any).message,
      id: message.output.id,
      escalationButton,
      hasErrors: true,
    })
  }
}
