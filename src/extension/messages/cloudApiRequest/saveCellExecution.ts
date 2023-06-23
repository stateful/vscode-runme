import { authentication } from 'vscode'
import { TelemetryReporter } from 'vscode-telemetry'

import { AuthenticationProviders, ClientMessages } from '../../../constants'
import { ClientMessage, IApiMessage } from '../../../types'
import { InitializeClient } from '../../api/client'
import { getCellByUuId } from '../../cell'
import { getAnnotations, getTerminalByCell } from '../../utils'
import { createCellExecutionQuery } from '../../api/grapql'
import { postClientMessage } from '../../../utils/messaging'
import { RunmeService } from '../../services/runme'
type APIRequestMessage = IApiMessage<ClientMessage<ClientMessages.cloudApiRequest>>

export default async function saveCellExecution(
  requestMessage: APIRequestMessage
): Promise<void | boolean> {
  const { messaging, message, editor } = requestMessage

  try {
    const session = await authentication.getSession(
      AuthenticationProviders.GitHub,
      ['user:email'],
      {
        createIfNone: true,
      }
    )

    if (!session) {
      throw new Error('You must authenticate with your GitHub account')
    }
    const cell = await getCellByUuId({ editor, uuid: message.output.uuid })
    if (!cell) {
      throw new Error('Cell not found')
    }
    const terminal = getTerminalByCell(cell)
    if (!terminal) {
      throw new Error('Could not find an associated terminal')
    }
    const pid = (await terminal.processId) || 0
    const runnerExitStatus = terminal.runnerSession?.hasExited()
    const exitCode = runnerExitStatus
      ? runnerExitStatus.type === 'exit'
        ? runnerExitStatus.code
        : -1
      : 0
    const annotations = getAnnotations(cell)
    delete annotations['runme.dev/uuid']
    const runmeService = new RunmeService({ githubAccessToken: session.accessToken })
    const runmeTokenResponse = await runmeService.getAccessToken()
    if (!runmeTokenResponse) {
      throw new Error('Unable to retrieve an access token')
    }
    const graphClient = InitializeClient({ runmeToken: runmeTokenResponse.token })
    const result = await graphClient.mutate({
      mutation: createCellExecutionQuery({
        ...message.output.data,
        exitCode,
        pid,
        input: encodeURIComponent(cell.document.getText()),
        metadata: {
          mimeType: annotations.mimeType,
          name: annotations.name,
          category: annotations.category,
        },
      }),
    })
    TelemetryReporter.sendTelemetryEvent('runme-app-share')
    return postClientMessage(messaging, ClientMessages.cloudApiResponse, {
      data: result,
      uuid: message.output.uuid,
    })
  } catch (error) {
    TelemetryReporter.sendTelemetryEvent('runme-app-error')
    return postClientMessage(messaging, ClientMessages.cloudApiResponse, {
      data: (error as any).message,
      uuid: message.output.uuid,
      hasErrors: true,
    })
  }
}
