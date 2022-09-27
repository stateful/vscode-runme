import fs from 'node:fs/promises'
import path from 'node:path'
import got from 'got'
import xdg from 'xdg-app-paths'
import { createDeployment } from '@vercel/client'
import { TextDocument, NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution, window } from 'vscode'

import { OutputType } from '../../constants'
import type { CellOutput } from '../../types'

interface VercelProject {
  id: string
  name: string
}

export async function vercel (
  exec: NotebookCellExecution,
  doc: TextDocument
  // inputHandler: EventEmitter
): Promise<boolean> {
  let token: string | null = null
  const cwd = path.dirname(doc.uri.path)

  try {
    /**
     * get Vercel token
     */
    const authFilePath = path.join(
      `${xdg('com.vercel.cli').dataDirs()[0]}.cli`,
      'auth.json'
    )
    const canRead = await fs.access(authFilePath).then(() => true, () => false)
    if (canRead) {
      token = JSON.parse((await fs.readFile(authFilePath, 'utf-8')).toString()).token
    } else {
      token = await window.showInputBox({
        title: 'Vercel Access Token',
        prompt: 'Please enter a valid access token to run a Vercel deployment.'
      }) || null
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
        NotebookCellOutputItem.json(<CellOutput>{
          type: OutputType.vercel,
          output: event
        }, OutputType.vercel)
      ]))
    }
  } catch (err: any) {
    exec.replaceOutput(new NotebookCellOutput([
      NotebookCellOutputItem.json(<CellOutput>{
        type: 'error',
        output: err.message
      }, OutputType.vercel)
    ]))
    return false
  }

  return true
}
