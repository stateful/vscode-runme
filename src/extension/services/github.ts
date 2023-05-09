import { Octokit } from 'octokit'
import { parse } from 'yaml'

import { IWorkflowDispatchOptions, IWorkflowYamlContentRequest } from './types'

export class GitHubService {
    private octokit: Octokit
    constructor(accessToken: string) {
        this.octokit = new Octokit({ auth: accessToken })
    }

    /**
     *  Dispatch a workflow
     */
    async createWorkflowDispatch(dispatchOptions: IWorkflowDispatchOptions):Promise<void> {
        const { owner, repo, workflow_id, ref, inputs } = dispatchOptions
        await this.octokit.rest.actions.createWorkflowDispatch({
            owner,
            repo,
            workflow_id,
            ref,
            inputs
        })

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
            path: `.github/workflows/${name}.yml`
        })

        const decodedContent = Buffer.from((workflow.data as any).content, 'base64').toString()
        return parse(decodedContent)
    }
}