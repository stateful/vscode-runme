import { NotebookEditor, NotebookRendererMessaging } from 'vscode'

import { ClientMessages } from '../../../constants'
import { APIMethod, ClientMessage } from '../../../types'
import { Kernel } from '../../kernel'

import saveCellExecution from './saveCellExecution'
import updateCellExecution from './updateCellExecution'
import createEscalation from './createEscalation'
import sendRunmeEvent from './trackRunmeEvent'

export interface IApiMessage {
  messaging: NotebookRendererMessaging
  message: ClientMessage<ClientMessages>
  editor: NotebookEditor
  kernel: Kernel
}

export async function handlePlatformApiMessage({
  messaging,
  message,
  editor,
  kernel,
}: IApiMessage): Promise<void | boolean> {
  if (message.type !== ClientMessages.platformApiRequest) {
    throw new Error('Only API Request messages are supported!')
  }
  switch (message.output.method) {
    case APIMethod.CreateCellExecution:
      return saveCellExecution({ messaging, message, editor }, kernel)
    case APIMethod.UpdateCellExecution:
      return updateCellExecution({ messaging, message, editor }, kernel)
    case APIMethod.CreateEscalation:
      return createEscalation({ messaging, message, editor }, kernel)
    case APIMethod.SendRunmeEvent:
      return sendRunmeEvent({ messaging, message, editor }, kernel)
    default:
      throw new Error('Method not implemented')
  }
}
