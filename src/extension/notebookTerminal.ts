import { workspace } from 'vscode'

import { OutputType } from '../constants'
import { CellOutputPayload, ICellOutput } from '../types'


class NotebookTerminal {
    static create(
        uuid: string,
        output?: { content?: string | undefined, removeState: boolean }): ICellOutput<OutputType.terminal> {
        const editorSettings = workspace.getConfiguration('editor')
        return <CellOutputPayload<OutputType.terminal>>{
            type: OutputType.terminal,
            output: {
                'runme.dev/uuid': uuid,
                terminalFontFamily: editorSettings.get<string>('fontFamily', 'Arial'),
                terminalFontSize: editorSettings.get<number>('fontSize', 10),
                ...output
            },
        }
    }
}

export default NotebookTerminal