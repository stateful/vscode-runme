import { NotebookRendererMessaging } from 'vscode'

import { ClientMessages } from '../../constants'
import { ClientMessage } from '../../types'
import { postClientMessage } from '../../utils/messaging'
import { checkWorkflowRunStatus, deployWorkflow } from '../executors/github/workflows'

export interface IGitHubMessaging {
    messaging: NotebookRendererMessaging
    message: ClientMessage<ClientMessages>
}

export default async function handleGitHubMessage({ messaging, message }: IGitHubMessaging): Promise<void> {
    if (message.type === ClientMessages.githubWorkflowDispatch) {
        const { itFailed, reason, workflowRun } = await deployWorkflow(message.output)
        postClientMessage(messaging, ClientMessages.githubWorkflowDeploy, {
            itFailed,
            reason,
            workflowRun,
            workflowId: message.output.workflow_id,
            cellId: message.output.cellId
        })
        if (!workflowRun) {
            return
        }
        await checkWorkflowRunStatus({
            owner: message.output.owner,
            repo: message.output.repo,
            run_id: Number(workflowRun.id),
            onStatusUpdate: (workflowRun) => {
                postClientMessage(messaging, ClientMessages.githubWorkflowStatusUpdate, {
                    workflowRun,
                    cellId: message.output.cellId
                })
            }
        })
    }

}