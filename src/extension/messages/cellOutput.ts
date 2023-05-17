import { NotebookCell } from 'vscode'

import { ClientMessages, OutputType } from '../../constants'
import { ClientMessage } from '../../types'
import { Kernel } from '../kernel'

export interface ICellOutputMessage {
    message: ClientMessage<ClientMessages>
    cell: NotebookCell
    kernel: Kernel
    outputType: OutputType
}

export async function handleCellOutputMessage(options: ICellOutputMessage): Promise<void> {
    const { message, cell, kernel, outputType } = options
    if (message.type === ClientMessages.closeCellOutput) {
        const outputs = await kernel.getCellOutputs(cell)
        await outputs.toggleOutput(outputType)
    }
}