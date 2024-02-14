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
    TelemetryReporter.sendTelemetryEvent('app.update')
    // TODO(cpda): Preserve consistent messaging format similar to CloudAPI to prevent unnecessary
    // modifications across components for now.
    return postClientMessage(messaging, ClientMessages.cloudApiResponse, {
      data: result,
      id: message.output.id,
    })
  } catch (error) {
    TelemetryReporter.sendTelemetryEvent('app.update.error')
    // TODO(cpda): Preserve consistent messaging format similar to CloudAPI to prevent unnecessary
    // modifications across components for now.
    return postClientMessage(messaging, ClientMessages.cloudApiResponse, {
      data: (error as any).message,
      id: message.output.id,
      hasErrors: true,
    })
  }
}
