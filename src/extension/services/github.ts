import { Octokit } from 'octokit'
import { parse } from 'yaml'
import { fetch } from 'cross-fetch'

import {
  Gist,
  GistResponse,
  IWorkflowDispatchOptions,
  IWorkflowRun,
  IWorkflowYamlContentRequest,
} from './types'

export type WorkflowRunFilter = Pick<IWorkflowDispatchOptions, 'owner' | 'repo'> & {
  run_id: number
}

export class GitHubService {
  private octokit: Octokit
  constructor(accessToken: string) {
    this.octokit = new Octokit({
      auth: accessToken,
      request: {
        fetch,
      },
    })
  }

  /**
   *  Dispatch a workflow
   */
  async createWorkflowDispatch(
    dispatchOptions: IWorkflowDispatchOptions,
  ): Promise<IWorkflowRun | undefined> {
    const { owner, repo, workflow_id, ref, inputs } = dispatchOptions
    const creationDate = new Date().toISOString()
    await this.octokit.rest.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id,
      ref,
      inputs,
    })

    // Since a workflow dispatch is only a webhook, there is no way to get the run id.
    // We need to iterate until we find a runner
    let runFound = false
    let maxIterations = 10
    let workflowRun
    while (!runFound || maxIterations === 0) {
      maxIterations--
      const runs = await this.octokit.rest.actions.listWorkflowRuns({
        owner,
        repo,
        workflow_id,
        created: `>=${creationDate}`,
      })

      if (runs.data.total_count) {
        runFound = true
        workflowRun = runs.data.workflow_runs[0]
      }
    }

    return { ...workflowRun, workflow_id } as unknown as IWorkflowRun
  }

  /**
   * Get a Workflow Run
   */
  async getWorkflowRun({
    owner,
    repo,
    run_id,
  }: WorkflowRunFilter): Promise<IWorkflowRun | undefined> {
    const workflowRun = await this.octokit.rest.actions.getWorkflowRun({
      owner,
      repo,
      run_id,
    })

    if (workflowRun.data) {
      return workflowRun.data as unknown as IWorkflowRun
    }
  }

  /**
   * Download the YAML content from a workflow file
   * @returns A workflow YAML file in JSON format
   */
  async getWorkflowYamlFile(options: IWorkflowYamlContentRequest): Promise<string> {
    const { owner, repo, name } = options
    const workflow = await this.octokit.rest.repos.getContent({
      owner,
      repo,
      path: `.github/workflows/${name}`,
    })
    if (!('content' in workflow.data)) {
      throw new Error('Failed to get workflow file content')
    }
    const decodedContent = Buffer.from((workflow.data as any).content, 'base64').toString()
    return parse(decodedContent)
  }

  async createGist({ isPublic, description, files }: Gist) {
    return this.octokit.request('POST /gists', {
      description,
      public: isPublic,
      files,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }) as Promise<GistResponse>
  }
}
