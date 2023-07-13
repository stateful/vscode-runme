import { NotebookEditor, NotebookRendererMessaging } from 'vscode'

import { ClientMessages } from '../../../constants'
import { APIMethod, ClientMessage } from '../../../types'
import { Kernel } from '../../kernel'

import saveCellExecution from './saveCellExecution'

export interface IApiMessage {
  messaging: NotebookRendererMessaging
  message: ClientMessage<ClientMessages>
  editor: NotebookEditor
  kernel: Kernel
}

export async function handleCloudApiMessage({
  messaging,
  message,
  editor,
  kernel,
}: IApiMessage): Promise<void | boolean> {
  if (message.type !== ClientMessages.cloudApiRequest) {
    throw new Error('Only API Request messages are supported!')
  }
  switch (message.output.method) {
    case APIMethod.CreateCellExecution:
      return saveCellExecution({ messaging, message, editor }, kernel)
    default:
      throw new Error('Method not implemented')
  }
}
