import { TelemetryReporter } from 'vscode-telemetry'

import { ClientMessages, NOTEBOOK_AUTOSAVE_ON } from '../../../constants'
import { ClientMessage, IApiMessage } from '../../../types'
import { InitializeClient } from '../../api/client'
import { getCellByUuId } from '../../cell'
import { getAnnotations, getAuthSession, getCellRunmeId } from '../../utils'
import { postClientMessage } from '../../../utils/messaging'
import { RunmeService } from '../../services/runme'
import { CreateCellExecutionDocument } from '../../__generated__/graphql'
import { Kernel } from '../../kernel'
import ContextState from '../../contextState'

type APIRequestMessage = IApiMessage<ClientMessage<ClientMessages.cloudApiRequest>>

export default async function saveCellExecution(
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
    const pid = (await terminal.processId) || 0
    const runnerExitStatus = terminal.runnerSession?.hasExited()
    const exitCode =
      runnerExitStatus?.type === 'exit'
        ? runnerExitStatus.code
        : runnerExitStatus?.type === 'error'
        ? 1
        : 0
    const annotations = getAnnotations(cell)
    delete annotations['runme.dev/uuid']
    const runmeService = new RunmeService({ githubAccessToken: session.accessToken })
    const runmeTokenResponse = await runmeService.getUserToken()
    if (!runmeTokenResponse) {
      throw new Error('Unable to retrieve an access token')
    }
    const graphClient = InitializeClient({ runmeToken: runmeTokenResponse.token })
    const terminalContents = Array.from(new TextEncoder().encode(message.output.data.stdout))
    const result = await graphClient.mutate({
      mutation: CreateCellExecutionDocument,
      variables: {
        data: {
          stdout: terminalContents,
          stderr: Array.from([]), // stderr will become applicable for non-terminal
          exitCode,
          pid,
          input: encodeURIComponent(cell.document.getText()),
          languageId: cell.document.languageId,
          autoSave: ContextState.getKey<boolean>(NOTEBOOK_AUTOSAVE_ON),
          metadata: {
            mimeType: annotations.mimeType,
            name: annotations.name,
            category: annotations.category || '',
            exitType: runnerExitStatus?.type,
            startTime: cell.executionSummary?.timing?.startTime,
            endTime: cell.executionSummary?.timing?.endTime,
          },
        },
      },
    })
    TelemetryReporter.sendTelemetryEvent('app.save')
    return postClientMessage(messaging, ClientMessages.cloudApiResponse, {
      data: result,
      uuid: message.output.uuid,
    })
  } catch (error) {
    TelemetryReporter.sendTelemetryEvent('app.error')
    return postClientMessage(messaging, ClientMessages.cloudApiResponse, {
      data: (error as any).message,
      uuid: message.output.uuid,
      hasErrors: true,
    })
  }
}
