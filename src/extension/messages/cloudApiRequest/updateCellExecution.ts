import { TelemetryReporter } from 'vscode-telemetry'

import { ClientMessages } from '../../../constants'
import { ClientMessage, IApiMessage } from '../../../types'
import { InitializeClient } from '../../api/client'
import { getCellByUuId } from '../../cell'
import { getAuthSession, getCellRunmeId } from '../../utils'
import { postClientMessage } from '../../../utils/messaging'
import { RunmeService } from '../../services/runme'
import { UpdateCellExecutionDocument } from '../../__generated__/graphql'
import { Kernel } from '../../kernel'

type APIRequestMessage = IApiMessage<ClientMessage<ClientMessages.cloudApiRequest>>

export default async function updateCellExecution(
  requestMessage: APIRequestMessage,
  kernel: Kernel,
): Promise<void | boolean> {
  const { messaging, message, editor } = requestMessage

  try {
    const session = await getAuthSession()

    if (!session) {
      throw new Error('You must authenticate with your GitHub account')
    }
    const cell = await getCellByUuId({ editor, uuid: message.output.uuid })
    if (!cell) {
      throw new Error('Cell not found')
    }

    const runmeId = getCellRunmeId(cell)
    const terminal = kernel.getTerminal(runmeId)
    if (!terminal) {
      throw new Error('Could not find an associated terminal')
    }
    const runmeService = new RunmeService({ githubAccessToken: session.accessToken })
    const runmeTokenResponse = await runmeService.getUserToken()
    if (!runmeTokenResponse) {
      throw new Error('Unable to retrieve an access token')
    }
    const graphClient = InitializeClient({ runmeToken: runmeTokenResponse.token })
    const result = await graphClient.mutate({
      mutation: UpdateCellExecutionDocument,
      variables: {
        id: message.output.data.id,
        data: {
          isPrivate: false,
        },
      },
    })
    TelemetryReporter.sendTelemetryEvent('app.update')
    return postClientMessage(messaging, ClientMessages.cloudApiResponse, {
      data: result,
      uuid: message.output.uuid,
    })
  } catch (error) {
    TelemetryReporter.sendTelemetryEvent('app.update.error')
    return postClientMessage(messaging, ClientMessages.cloudApiResponse, {
      data: (error as any).message,
      uuid: message.output.uuid,
      hasErrors: true,
    })
  }
}
