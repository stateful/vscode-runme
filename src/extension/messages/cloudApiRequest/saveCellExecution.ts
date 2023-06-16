import { ClientMessages } from '../../../constants'
import { ClientMessage, IApiMessage } from '../../../types'
import { InitializeClient } from '../../api/client'
import { getCellByUuId } from '../../cell'
import { getAnnotations, getTerminalByCell } from '../../utils'
import { createCellExecutionQuery } from '../../api/grapql'
import { postClientMessage } from '../../../utils/messaging'
type APIRequestMessage = IApiMessage<ClientMessage<ClientMessages.cloudApiRequest>>

export default async function saveCellExecution(
  requestMessage: APIRequestMessage
): Promise<void | boolean> {
  const { messaging, message, editor } = requestMessage

  try {
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

    const graphClient = InitializeClient()
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

    return postClientMessage(messaging, ClientMessages.cloudApiResponse, {
      data: result,
      uuid: message.output.uuid,
    })
  } catch (error) {
    return postClientMessage(messaging, ClientMessages.cloudApiResponse, {
      data: (error as any).message,
      uuid: message.output.uuid,
      hasErrors: true,
    })
  }
}
