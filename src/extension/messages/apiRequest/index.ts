import { NotebookEditor, NotebookRendererMessaging } from 'vscode'


import { ClientMessages } from '../../../constants'
import { APIMethod, ClientMessage } from '../../../types'

import createCellExecution from './createCellExecution'


export interface IApiMessage {
    messaging: NotebookRendererMessaging
    message: ClientMessage<ClientMessages>
    editor: NotebookEditor
}

export default async function handleApiMessage({ messaging, message, editor }: IApiMessage): Promise<void | boolean> {
    if (message.type !== ClientMessages.apiRequest) {
        throw new Error('Only API Request messages are supported!')
    }
    switch (message.output.method) {
        case APIMethod.CreateCellExecution: return createCellExecution({ messaging, message, editor })
        default: throw new Error('Method not implemented')
    }
}