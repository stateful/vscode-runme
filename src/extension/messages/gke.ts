import path from 'node:path'

import {
  NotebookCellData,
  NotebookCellKind,
  NotebookEdit,
  NotebookEditor,
  NotebookRendererMessaging,
  WorkspaceEdit,
  workspace,
  commands,
} from 'vscode'

import { ClientMessages } from '../../constants'
import { ClientMessage } from '../../types'
import { postClientMessage } from '../../utils/messaging'
import { getClusterDetails, waitForClusterStatus } from '../executors/gke/clusters'
import { getCellById } from '../cell'

export interface GKEStatusMessaging {
  messaging: NotebookRendererMessaging
  message: ClientMessage<ClientMessages>
  editor: NotebookEditor
}

export async function handleClusterMessage({
  messaging,
  message,
  editor,
}: GKEStatusMessaging): Promise<void> {
  if (
    ![
      ClientMessages.gkeClusterCheckStatus,
      ClientMessages.gkeClusterDetails,
      ClientMessages.gkeClusterDetailsNewCell,
    ].includes(message.type)
  ) {
    return
  }

  if (message.type === ClientMessages.gkeClusterCheckStatus) {
    await waitForClusterStatus({
      clusterId: message.output.clusterId,
      currentStatus: message.output.status,
      clusterName: message.output.clusterName,
      projectId: message.output.projectId,
      location: message.output.location,
      onClusterStatus: (clusterId: string, status: string) => {
        postClientMessage(messaging, ClientMessages.gkeClusterStatusChanged, {
          clusterId,
          status,
          cellId: message.output.cellId,
        })
      },
    })

    return
  }

  if (message.type === ClientMessages.gkeClusterDetails) {
    const { itFailed, data, reason } = await getClusterDetails(
      message.output.cluster,
      message.output.location,
      message.output.projectId,
    )

    postClientMessage(messaging, ClientMessages.gkeClusterDetailsResponse, {
      itFailed,
      reason,
      data,
      cellId: message.output.cellId,
      executedInNewCell: true,
      cluster: message.output.cluster,
    })

    return
  }

  if (message.type === ClientMessages.gkeClusterDetailsNewCell) {
    const cell = await getCellById({ editor, id: message.output.cellId })
    if (!cell) {
      throw new Error('Cell not found')
    }

    //TODO: I will move this to a proper place
    const url = new URL('https://console.cloud.google.com')
    url.pathname = path.join(
      'kubernetes',
      'clusters',
      'details',
      message.output.location,
      message.output.cluster,
      'details',
    )
    url.search = `project=${message.output.project}`

    const newCellData = new NotebookCellData(NotebookCellKind.Code, url.toString(), 'sh')
    const notebookEdit = NotebookEdit.insertCells(cell.index + 1, [newCellData])
    const edit = new WorkspaceEdit()
    edit.set(cell.notebook.uri, [notebookEdit])
    workspace.applyEdit(edit)
    await commands.executeCommand('notebook.focusNextEditor')
    await commands.executeCommand('notebook.cell.execute')
    await commands.executeCommand('notebook.cell.focusInOutput')
  }
}
