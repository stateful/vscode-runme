import { NotebookCell } from 'vscode'
import { suite, vi, test, expect } from 'vitest'

import { handleCellOutputMessage } from '../../../src/extension/messages/cellOutput'
import { ClientMessages, OutputType } from '../../../src/constants'
import { Kernel } from '../../../src/extension/kernel'

vi.mock('vscode')
vi.mock('vscode-telemetry')
vi.mock('../../../src/extension/runner', () => ({}))

suite('Handle CellOutput messages', () => {
    test('Annotations cell output', async () => {
        const cell = {
            outputs: [{
                items: [
                    { id: '', items: [], metadata: {}, mime: OutputType.annotations }
                ]
            }],
            executionSummary: {
                success: false
            },
            metadata: {},
        } as unknown as NotebookCell
        const kernel = new Kernel({} as any)
        const toggleOutput = vi.fn().mockImplementation(() => { })
        kernel.getCellOutputs = vi.fn().mockResolvedValue({
            toggleOutput
        })
        await handleCellOutputMessage({
            kernel,
            cell,
            outputType: OutputType.annotations,
            message: {
                type: ClientMessages.closeCellOutput,
                output: {
                    cellIndex: 1
                }
            }
        })
        expect(toggleOutput).toBeCalledTimes(1)
        expect(toggleOutput).toBeCalledWith(OutputType.annotations)
    })
})