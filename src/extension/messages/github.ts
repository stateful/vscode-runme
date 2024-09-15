import { NotebookEditor, NotebookRendererMessaging, window, commands, Uri, workspace } from 'vscode'

import { ClientMessages } from '../../constants'
import { ClientMessage } from '../../types'
import { postClientMessage } from '../../utils/messaging'
import { checkWorkflowRunStatus, deployWorkflow } from '../executors/github/workflows'
import { Kernel } from '../kernel'
import { getCellById } from '../cell'
import { GrpcSerializer } from '../serializer'
import { openFileAsRunmeNotebook } from '../utils'
import { getSessionOutputs } from '../../utils/configuration'

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
  message,
  editor,
}: {
  kernel: Kernel
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
    const outputFilePath = getSessionOutputs()
      ? GrpcSerializer.getOutputsUri(cell.document.uri, sessionId)
      : Uri.parse(`memfs:/session-${sessionId}.md`)

    const sessionFileExists = await workspace.fs.stat(outputFilePath).then(
      () => true,
      () => false,
    )
    if (!sessionFileExists) {
      return window
        .showWarningMessage(
          'No session outputs files found. Enable Auto-Save, rerun the cell, and click again.',
          'Enable and Re-run',
        )
        .then(async (selected) => {
          if (selected === 'Enable and Re-run') {
            await commands.executeCommand('runme.notebookAutoSaveOff')
            await commands.executeCommand('notebook.cell.execute')
          }
        })
    }
    openFileAsRunmeNotebook(outputFilePath)
  }
}
