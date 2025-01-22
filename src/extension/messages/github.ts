import { NotebookEditor, NotebookRendererMessaging } from 'vscode'

import { ClientMessages } from '../../constants'
import { ClientMessage } from '../../types'
import { postClientMessage } from '../../utils/messaging'
import { checkWorkflowRunStatus, deployWorkflow } from '../executors/github/workflows'
import { Kernel } from '../kernel'
import { getCellById } from '../cell'
import { openPreviewOutputs } from '../commands'
import { ISerializer } from '../serializer'

export interface IGitHubMessaging {
  messaging: NotebookRendererMessaging
  message: ClientMessage<ClientMessages>
}

export default async function handleGitHubMessage({
  messaging,
  message,
}: IGitHubMessaging): Promise<void> {
  if (message.type !== ClientMessages.githubWorkflowDispatch) {
    return
  }
  const { itFailed, reason, workflowRun } = await deployWorkflow(message.output)
  postClientMessage(messaging, ClientMessages.githubWorkflowDeploy, {
    itFailed,
    reason,
    workflowRun,
    workflowId: message.output.workflow_id,
    cellId: message.output.cellId,
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
        cellId: message.output.cellId,
      })
    },
  })
}

export async function handleGistMessage({
  kernel,
  serializer,
  message,
  editor,
}: {
  kernel: Kernel
  serializer: ISerializer
  message: ClientMessage<ClientMessages.gistCell>
  editor: NotebookEditor
}) {
  const runnerEnv = kernel.getRunnerEnvironment()
  const sessionId = runnerEnv?.getSessionId()
  if (!sessionId) {
    return // Display message
  }
  const cell = await getCellById({ editor, id: message.output.cellId })

  if (cell) {
    await openPreviewOutputs(editor.notebook.uri, sessionId, serializer)
  }
}
