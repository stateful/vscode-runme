import fs from 'node:fs/promises'
import path from 'node:path'

import got from 'got'
import { createDeployment } from '@vercel/client'
import { TextDocument, NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution, window } from 'vscode'

import { OutputType } from '../../../constants'
import type { CellOutput } from '../../../types'

import { getAuthToken } from './utils'

interface VercelProject {
  id: string
  name: string
}

export async function deploy (
  exec: NotebookCellExecution,
  doc: TextDocument,
): Promise<boolean> {
  let token = await getAuthToken()
  const cwd = path.dirname(doc.uri.fsPath)

  try {
    /**
     * if user is not logged in with their machine, ask for an access token
     */
    if (!token) {
      token = await window.showInputBox({
        title: 'Vercel Access Token',
        prompt: 'Please enter a valid access token to run a Vercel deployment.'
      })
    }

    if (!token) {
      throw new Error('No token supplied')
    }

    /**
     * get project information (e.g. name to be able to deploy)
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const headers = { Authorization: `Bearer ${token}` }
    const { projectId } = JSON.parse((await fs.readFile(path.join(cwd, '.vercel', 'project.json'))).toString())
    const project = await got(`https://api.vercel.com/v9/projects/${projectId}`, { headers }).json() as VercelProject

    /**
     * deploy application
     */
    const clientParams = { token, path: cwd }
    const deployParams = { name: project.name }
    for await (const event of createDeployment(clientParams, deployParams)) {
      exec.replaceOutput(new NotebookCellOutput([
        NotebookCellOutputItem.json(<CellOutput<OutputType.vercel>>{
          type: OutputType.vercel,
          output: event
        }, OutputType.vercel)
      ]))
    }
  } catch (err: any) {
    exec.replaceOutput(new NotebookCellOutput([
      NotebookCellOutputItem.json(<CellOutput<OutputType.error>>{
        type: 'error',
        output: err.message
      }, OutputType.error)
    ]))
    return false
  }

  return true
}
