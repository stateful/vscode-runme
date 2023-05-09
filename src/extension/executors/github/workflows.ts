import { authentication } from 'vscode'

import { GitHubService } from '../../services'
import { IWorkflowDispatchOptions, IWorkflowRun } from '../../services/types'

const WORKFLOW_RUN_PROGRESS_STATUS = ['in_progress', 'queued', 'requested', 'waiting', 'pending']

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
export type WorkflowRunStatus = Pick<IWorkflowDispatchOptions, 'owner' | 'repo'> & { run_id: number, onStatusUpdate: OnWorkflowStatusUpdate }

export type OnWorkflowStatusUpdate = (workflowRun: IWorkflowRun | undefined) => void

export async function getYamlFileContents(options: Omit<IGitHubURLParts, 'ref'>) {
    try {
        const githubService = await getService()
        const { owner, repo, path } = options
        return githubService.getWorkflowYamlFile({
            owner,
            repo,
            name: path
        })
    } catch (error) {
        throw error
    }
}

export async function deployWorkflow(options: IWorkflowDispatchOptions): Promise<IWorkflowRunResult> {
    try {
        const githubService = await getService()
        const workflowRun = await githubService.createWorkflowDispatch(options)
        return {
            itFailed: false,
            workflowRun
        }

    } catch (error: any) {
        return { itFailed: true, reason: error.message }
    }

}

export async function getService() {
    try {
        const session = await authentication.getSession('github', ['repo'])
        if (!session) {
            throw new Error('Missing a valid GitHub session')
        }
        return new GitHubService(session.accessToken)
    } catch (error) {
        throw error
    }

}


export async function checkWorkflowRunStatus({ owner, repo, run_id, onStatusUpdate }: WorkflowRunStatus): Promise<void> {
    // Check for workflow status update
    let checkStatus = true
    const githubService = await getService()
    while (checkStatus) {
        try {
            let workflowRun = await githubService.getWorkflowRun({
                owner,
                repo,
                run_id
            })
            if (workflowRun?.status && !WORKFLOW_RUN_PROGRESS_STATUS.includes(workflowRun?.status)) {
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
    const ref = parts[6]
    const path = parts[parts.length - 1]
    return { owner, repo, path, ref }
}