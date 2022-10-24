import fs from 'node:fs/promises'
import path from 'node:path'

import sanitize from 'filenamify'
import { createDeployment } from '@vercel/client'
import { TextDocument, NotebookCellOutput, NotebookCellOutputItem, NotebookCellExecution, window } from 'vscode'

import { OutputType } from '../../../constants'
import type { CellOutput } from '../../../types'

import { listTeams, getUser, getProject, getProjects, createProject, VercelProject } from './api'
import { getAuthToken, quickPick, updateGitIgnore, createVercelFile } from './utils'
import { VERCEL_DIR } from './constants'

const REPLACEMENT = '-'
const LINK_OPTIONS = [
  'Link Project to existing Vercel project',
  'Create a new Vercel Project'
]

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

    const headers = { Authorization: `Bearer ${token}` }

    /**
     * check if project is linked
     */
    const vercelConfigPath = path.resolve(cwd, VERCEL_DIR, 'project.json')
    const hasVercelConfig = await fs.access(vercelConfigPath)
      .then(() => true, () => false)
    if (!hasVercelConfig) {
      const linkProject = await quickPick(
        'Project is not linked yet, what do you like to do?',
        LINK_OPTIONS,
        (selection) => selection[0].label === LINK_OPTIONS[0]
      )

      const { teams } = await listTeams(headers)
      const { user } = await getUser(headers)
      const scope = await quickPick(
        'Which scope do you want to deploy to?',
        [ user.username, ...teams.map((t) => t.slug) ]
      ) as string
      const org = scope === user.username ? user : teams.find((t) => t.slug === scope)
      const orgSlug = scope === user.username ? user.username : teams.find((t) => t.slug === scope)?.slug

      if (linkProject) {
        const { projects } = await getProjects(scope === user.username ? undefined : scope, headers)
        const projectToLink = await quickPick<VercelProject>(
          'To which existing project do you want to link?',
          projects.map((p) => p.name),
          (selection) => projects.find((p) => p.name === selection[0].label)
        )

        await createVercelFile(cwd, org?.id!, projectToLink.id)
        await updateGitIgnore(cwd, orgSlug!, projectToLink.name)
      } else {
        const suggestion = cwd.split('/').pop()
        const projectName = await window.showInputBox({
          title: 'Vercel Project Name',
          prompt: 'Enter a name for the new project!',
          value: suggestion
        })

        if (!projectName) {
          throw new Error('Please enter a valid project name!')
        }

        const sanitizedName = sanitize(projectName, { replacement: REPLACEMENT }).replace(' ', REPLACEMENT)
        const project = await createProject(sanitizedName, headers)
        window.showInformationMessage(`Created new project ${orgSlug}/${project.name}`)
        await createVercelFile(cwd, org?.id!, project.id)
        await updateGitIgnore(cwd, orgSlug!, project.name)
      }
    }

    /**
     * get project information (e.g. name to be able to deploy)
     */
    const { projectId } = JSON.parse((await fs.readFile(path.join(cwd, VERCEL_DIR, 'project.json'))).toString())
    const project = await getProject(projectId, headers)

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
        type: OutputType.error,
        output: err.message
      }, OutputType.error)
    ]))
    return false
  }

  return true
}
