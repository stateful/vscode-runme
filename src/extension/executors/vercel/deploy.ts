import fs from 'node:fs/promises'
import path from 'node:path'

import sanitize from 'filenamify'
import frameworkList, { Framework } from '@vercel/frameworks'
import { createDeployment, VercelClientOptions, DeploymentOptions } from '@vercel/client'
import { TextDocument, NotebookCellExecution, window } from 'vscode'

import { OutputType } from '../../../constants'
import type { Kernel } from '../../kernel'
import type { VercelState } from '../../../types'
import { NotebookCellOutputManager, updateCellMetadata } from '../../cell'

import { listTeams, getUser, getProject, getProjects, createProject, cancelDeployment, VercelProject } from './api'
import { getAuthToken, quickPick, updateGitIgnore, createVercelFile } from './utils'
import { VERCEL_DIR } from './constants'

const REPLACEMENT = '-'
const LINK_OPTIONS = [
  'Link Project to existing Vercel project',
  'Create a new Vercel Project'
]

export async function deploy (
  this: Kernel,
  exec: NotebookCellExecution,
  doc: TextDocument,
  outputs: NotebookCellOutputManager,
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

    const clientParams: VercelClientOptions = {
      token,
      path: cwd,
      debug: false
    }
    const deployParams: DeploymentOptions = {}
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

        deployParams.name = projectToLink.name
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

        const sanitizedName = sanitize(projectName, { replacement: REPLACEMENT })
          .replace(/\s/g, REPLACEMENT)
          .toLowerCase()
        const project = await createProject(sanitizedName, headers)
        deployParams.name = project.name
        window.showInformationMessage(`Created new project ${orgSlug}/${project.name}`)
        await createVercelFile(cwd, org?.id!, project.id)
        await updateGitIgnore(cwd, orgSlug!, project.name)
      }

      /**
       * have user pick framework
       */
      const framework = await quickPick<Framework>(
        'Which framework preset are you using?',
        frameworkList.map((f) => f.name),
        (selection) => frameworkList.find((f) => f.name === selection[0].label)
      )
      deployParams.projectSettings = {
        framework: framework.slug
      }
    } else {
      /**
       * get project information (e.g. name to be able to deploy)
       */
      const { projectId } = JSON.parse((await fs.readFile(path.join(cwd, VERCEL_DIR, 'project.json'))).toString())
      const project = await getProject(projectId, headers)
      deployParams.name = project.name
    }

    /**
     * deploy application
     */
    console.log(`[Runme] Deploy project "${deployParams.name}"`)
    let deploymentId: string | null = null
    let deployCanceled = false
    this.context.subscriptions.push(exec.token.onCancellationRequested(async () => {
      if (!deploymentId) {
        return
      }
      await cancelDeployment(deploymentId, headers)
      deployCanceled = true
    }))
    for await (const event of createDeployment(clientParams, deployParams)) {
      if (event.type === 'error') {
        throw Error(event.payload.message)
      }

      deploymentId = event.payload.id

      const vercelState: VercelState = {
        outputItems: [],
        payload: event.payload,
        type: event.type,
      }

      updateCellMetadata(exec.cell, { 'runme.dev/vercelState': vercelState })
      outputs.showOutput(OutputType.vercel)

      if (deployCanceled) {
        break
      }
    }
  } catch (err: any) {
    updateCellMetadata(exec.cell, { 'runme.dev/vercelState': { error: err.message, outputItems: [] }})
    outputs.showOutput(OutputType.vercel)

    return false
  }

  return true
}
