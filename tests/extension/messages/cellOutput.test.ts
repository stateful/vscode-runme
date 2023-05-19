import { NotebookCell } from 'vscode'
import { suite, vi, test, expect } from 'vitest'

import { handleCellOutputMessage } from '../../../src/extension/messages/cellOutput'
import { ClientMessages, OutputType } from '../../../src/constants'
import { Kernel } from '../../../src/extension/kernel'

vi.mock('vscode')
vi.mock('vscode-telemetry')
vi.mock('../../../src/extension/runner', () => ({}))

suite('Handle CellOutput messages', () => {

    const mockOutput = (type: OutputType) => {
        const cell = {
            outputs: [{
                items: [
                    { id: '', items: [], metadata: {}, mime: type }
                ]
            }],
            executionSummary: {
                success: false
            },
            metadata: {},
        } as unknown as NotebookCell
        const kernel = new Kernel({} as any)
        const toggleOutput = vi.fn().mockImplementation(() => { })
        const toggleTerminal = vi.fn().mockImplementation(() => { })
        kernel.getCellOutputs = vi.fn().mockResolvedValue({
            toggleOutput,
            toggleTerminal
        })

        return {
            toggleOutput,
            toggleTerminal,
            kernel,
            cell
        }
    }

    const expectOutput = async (type: OutputType) => {
        const { kernel, cell, toggleOutput, toggleTerminal } = mockOutput(type)
        const outputCaller = [OutputType.terminal, OutputType.outputItems]
            .includes(type) ?
            toggleTerminal :
            toggleOutput
        await handleCellOutputMessage({
            kernel,
            cell,
            outputType: type,
            message: {
                type: ClientMessages.closeCellOutput,
                output: {
                    cellIndex: 1,
                    outputType: type
                }
            }
        })
        expect(outputCaller).toBeCalledTimes(1)
        if (outputCaller instanceof toggleOutput) {
            expect(outputCaller).toBeCalledWith(type)
        }
    }

    test('Annotations cell output', async () => {
        return expectOutput(OutputType.annotations)
    })

    test('Terminal cell output', async () => {
        return expectOutput(OutputType.terminal)
    })

    test('OutputItems cell output', async () => {
        return expectOutput(OutputType.outputItems)
    })

    test('Vercel cell output', async () => {
        return expectOutput(OutputType.vercel)
    })
})