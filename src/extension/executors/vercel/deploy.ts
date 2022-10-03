import fs from 'node:fs/promises'
import path from 'node:path'
import got from 'got'
// import { createDeployment } from '@vercel/client'
import { TextDocument, NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution, window } from 'vscode'

import { OutputType } from '../../../constants'
import type { CellOutput } from '../../../types'
import { getAuthToken } from './utils'

export async function deploy (
  exec: NotebookCellExecution,
  doc: TextDocument,
  // argv: any
): Promise<boolean> {
  let token = await getAuthToken()
  const cwd = path.dirname(doc.uri.path)

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
    const projectStr = (await fs.readFile(path.join(cwd, '.vercel', 'project.json'))).toString()
    const { projectId, orgId } = JSON.parse(projectStr)
    // const project = (await got(
    //   `https://api.vercel.com/v9/projects/${projectId}?teamId=${orgId}`,
    //   { headers }
    // ).json()) as VercelProject
    let status = 'UNKNOWN'
    let timeout = 4000
    const state = ['BUILDING', 'ERROR', 'INITIALIZING', 'QUEUED', 'READY', 'CANCELED'].join(',')

    while (!['READY', 'ERROR', 'CANCELED'].find(s => s === status)) {
      await new Promise<void>(resolve => {
        setTimeout(() => {
          resolve()
        }, timeout)
      })

      const data: any = await got(
        `https://api.vercel.com/v6/deployments?projectId=${projectId}&teamId=${orgId}&state=${state}&limit=1`,
        { headers }
      ).json()

      for (const deploy of data.deployments) {
        status = deploy.state
        exec.replaceOutput(new NotebookCellOutput([
          NotebookCellOutputItem.json(<CellOutput>{
            type: OutputType.vercel,
            output: deploy
          }, OutputType.vercel)
        ], { vercelApp: { deploy: true } }))
      }
      timeout = 2000
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
