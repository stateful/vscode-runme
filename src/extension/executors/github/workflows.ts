import { type IWorkflowDispatchOptions, type IWorkflowRun } from '../../services/types'
import GitHubServiceFactory from '../../services/github/factory'

export type IGitHubURLParts = {
  owner: string
  repo: string
  path: string
  ref: string
}

export interface IWorkflowRunResult {
  itFailed: boolean
  reason?: string
  workflowRun?: IWorkflowRun
}

/* eslint-disable max-len */
export type WorkflowRunStatus = Pick<IWorkflowDispatchOptions, 'owner' | 'repo'> & {
  run_id: number
  onStatusUpdate: OnWorkflowStatusUpdate
}

export type OnWorkflowStatusUpdate = (workflowRun: IWorkflowRun | undefined) => void

const workflowService = new GitHubServiceFactory(['repo'])

export async function getYamlFileContents(options: Omit<IGitHubURLParts, 'ref'>): Promise<string> {
  const githubService = await workflowService.createService()
  const { owner, repo, path } = options
  return githubService.getWorkflowYamlFile({
    owner,
    repo,
    name: path,
  })
}

export async function deployWorkflow(
  options: IWorkflowDispatchOptions,
): Promise<IWorkflowRunResult> {
  try {
    const githubService = await workflowService.createService()
    const workflowRun = await githubService.createWorkflowDispatch(options)
    return {
      itFailed: false,
      workflowRun,
    }
  } catch (error: any) {
    return { itFailed: true, reason: error.message }
  }
}

export async function checkWorkflowRunStatus({
  owner,
  repo,
  run_id,
  onStatusUpdate,
}: WorkflowRunStatus): Promise<void> {
  // Check for workflow status update
  let checkStatus = true
  const githubService = await workflowService.createService()
  while (checkStatus) {
    try {
      let workflowRun = await githubService.getWorkflowRun({
        owner,
        repo,
        run_id,
      })

      if (workflowRun?.status === 'completed') {
        checkStatus = false
      }
      onStatusUpdate(workflowRun)
    } catch (error) {
      checkStatus = false
      throw error
    }
  }
}

/**
 * Extracts the owner, repo, ref and path from a GitHub URL
 * @param workflowUrl
 */
export function parseGitHubURL(workflowUrl: string): IGitHubURLParts {
  const parts = workflowUrl.split('/')
  const owner = parts[3]
  const repo = parts[4]
  const ref = parts[5] === 'actions' && parts[6] === 'workflows' ? 'main' : parts[6]
  const path = parts[parts.length - 1]
  if (!owner || !repo || !ref || !path) {
    throw new Error('Invalid GitHub URL')
  }
  return { owner, repo, path, ref }
}
