import path from 'node:path'
import { writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import type EventEmitter from 'node:events'

import { TextDocument, NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution } from 'vscode'
import { file } from 'tmp-promise'

import { OUTPUT_MIME_TYPE } from '../constants'

import type { StdoutOutput } from '../../types'

async function shellExecutor(
  exec: NotebookCellExecution,
  doc: TextDocument,
  inputHandler: EventEmitter
): Promise<boolean> {
  const outputItems: string[] = []
  const scriptFile = await file()
  await writeFile(scriptFile.path, doc.getText(), 'utf-8')

  const child = spawn('sh', [scriptFile.path], {
    cwd: path.dirname(doc.uri.path)
  })

  inputHandler.on('data', (input) => {
    child.stdin.write(`${input}\n`)
    /**
     * the following prevents a second prompt to accept any input
     * but not calling it causes the process to never exit
     */
    // child.stdin.end()
  })

  /**
   * handle output for stdout and stderr
   */
  function handleOutput(data: any) {
    outputItems.push(data.toString().trim())
    exec.replaceOutput(new NotebookCellOutput([
      NotebookCellOutputItem.json(<StdoutOutput>{
        output: outputItems.join('\n')
      }, OUTPUT_MIME_TYPE)
    ]))
  }

  child.stdout.on('data', handleOutput)
  child.stderr.on('data', handleOutput)
  return !Boolean(await new Promise((resolve) => child.on('exit', resolve)))
}

export const sh = shellExecutor
export const bash = shellExecutor
