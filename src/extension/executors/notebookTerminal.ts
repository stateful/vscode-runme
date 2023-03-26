import { NotebookCell, NotebookCellOutput, NotebookCellOutputItem, window } from 'vscode'

import { Kernel } from '../kernel'
import { replaceOutput } from '../utils'
import { OutputType } from '../../constants'
import NotebookTerminal from '../notebookTerminal'

export async function NotebookTerminalExecutor(cell: NotebookCell, kernel: Kernel) {
    let exec
    try {
        const { 'runme.dev/uuid': uuid } = cell.metadata
        exec = await kernel.createCellExecution(cell)
        exec.start(Date.now())
        await replaceOutput(exec, [
            new NotebookCellOutput([
                NotebookCellOutputItem.json(NotebookTerminal.create(uuid), OutputType.terminal),
            ]),
        ])
    } catch (e: any) {
        window.showErrorMessage(e.message)
    } finally {
        exec?.end(true)
    }
}