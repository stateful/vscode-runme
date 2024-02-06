import { NotebookCell } from 'vscode'

import { VercelState } from '../../types'
import { NotebookCellOutputManager, updateCellMetadata } from '../cell'
import { OutputType } from '../../constants'

import { bash } from './task'

import type { IEnvironmentManager, IKernelExecutor } from '.'

export const vercel: IKernelExecutor = async (executor) => {
  const { doc, exec, outputs, runScript } = executor
  const command = doc.getText()

  try {
    /**
     * limit vercel commands to single lines
     */
    if (command.includes('\n')) {
      throw new Error('Currently only one-liner Vercel commands are supported')
    }

    /**
     * other commands passed to the CLI
     */
    return runScript?.() ?? bash(executor)
  } catch (err: any) {
    updateCellMetadata(exec.cell, {
      'runme.dev/vercelState': { error: err.message, outputItems: [] },
    })
    outputs.showOutput(OutputType.vercel)

    return false
  }
}

export async function handleVercelDeployOutput(
  cell: NotebookCell,
  outputs: NotebookCellOutputManager,
  outputItems: Buffer[],
  index: number,
  prod: boolean,
  environment?: IEnvironmentManager,
) {
  const states = ['Queued', 'Building', 'Completing'].reverse()

  const status = (
    states.find((s) =>
      outputItems.find(
        (oi) => oi.toString().toLocaleLowerCase().indexOf(s.toLocaleLowerCase()) > -1,
      ),
    ) || 'pending'
  ).replaceAll('Completing', 'complete')
  // should get this from API instead
  const projectName = await environment?.get('PROJECT_NAME')

  const vercelState: VercelState = {
    outputItems: outputItems.map((oi) => oi.toString()),
    payload: { status, projectName, index, prod },
  }

  outputs.setState({
    type: OutputType.vercel,
    state: vercelState,
  })

  await outputs.showOutput(OutputType.vercel)
}

export function isVercelDeployScript(script: string): boolean {
  return Boolean(script.split(';').pop()?.trim() === 'vercel')
}
