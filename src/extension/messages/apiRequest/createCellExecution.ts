import { ClientMessages } from '../../../constants'
import { ClientMessage, IApiMessage } from '../../../types'
import { InitializeClient } from '../../api/client'
import { getCellByUuId } from '../../cell'
import { getTerminalByCell } from '../../utils'
import { createCellExecutionQuery } from '../../api/grapql'
import { postClientMessage } from '../../../utils/messaging'

type APIRequestMessage = IApiMessage<ClientMessage<ClientMessages.apiRequest>>

export default async function createCellExecution(requestMessage: APIRequestMessage): Promise<void | boolean> {
    try {

        const { messaging, message, editor } = requestMessage
        const cell = await getCellByUuId({ editor, uuid: message.output.uuid })
        if (!cell) {
            throw new Error('Cell not found')
        }
        const terminal = await getTerminalByCell(cell)
        if (!terminal) {
            throw new Error('Could not find an associated terminal')
        }
        const pid = await terminal.processId || 0
        const exitCode = cell.executionSummary?.success ? 0 : -1
        const graphClient = InitializeClient()

        const result = await graphClient.mutate({
            mutation: createCellExecutionQuery({ ...message.output.data, exitCode, pid })
        })

        return postClientMessage(messaging, ClientMessages.apiResponse, {
            data: result,
            uuid: message.output.uuid
        })
    } catch (error) {
        return postClientMessage(messaging, ClientMessages.apiResponse, {
            data: (error as any).message,
            uuid: message.output.uuid,
            hasErrors: true
        })
    }
} 