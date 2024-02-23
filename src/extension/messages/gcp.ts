import path from 'node:path'

import { NotebookEditor, NotebookRendererMessaging } from 'vscode'

import { ClientMessages } from '../../constants'
import { ClientMessage, GceActionType, InstanceStatusType } from '../../types'
import { postClientMessage } from '../../utils/messaging'
import { getClusterDetails, waitForClusterStatus } from '../executors/gcp/gke/clusters'
import { insertCodeCell } from '../cell'
import {
  startInstance,
  stopInstance,
  suspendInstance,
  waitForInstanceStatus,
} from '../executors/gcp/gce/vmInstances'

export interface GCPStatusMessaging {
  messaging: NotebookRendererMessaging
  message: ClientMessage<ClientMessages>
  editor: NotebookEditor
}

export async function handleGCPMessage({ messaging, message, editor }: GCPStatusMessaging) {
  switch (message.type) {
    case ClientMessages.gcpClusterCheckStatus:
      return waitForClusterStatus({
        clusterId: message.output.clusterId,
        currentStatus: message.output.status,
        clusterName: message.output.clusterName,
        projectId: message.output.projectId,
        location: message.output.location,
        onClusterStatus: (clusterId: string, status: string) => {
          postClientMessage(messaging, ClientMessages.gcpResourceStatusChanged, {
            resourceId: clusterId,
            cellId: message.output.cellId,
            status,
            hasErrors: false,
          })
        },
      })

    case ClientMessages.gcpClusterDetails: {
      const { itFailed, data, reason } = await getClusterDetails(
        message.output.cluster,
        message.output.location,
        message.output.projectId,
      )

      postClientMessage(messaging, ClientMessages.gcpClusterDetailsResponse, {
        itFailed,
        reason,
        data,
        cellId: message.output.cellId,
        executedInNewCell: true,
        cluster: message.output.cluster,
      })

      return
    }

    case ClientMessages.gcpClusterDetailsNewCell: {
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
      return insertCodeCell(message.output.cellId, editor, url.toString())
    }

    case ClientMessages.gcpVMInstanceAction: {
      switch (message.output.action) {
        case GceActionType.ConnectViaSSH:
          return insertCodeCell(
            message.output.cellId,
            editor,
            // eslint-disable-next-line max-len
            `gcloud compute ssh --zone "${message.output.zone}" "${message.output.instance}" --project "${message.output.project}"`,
            'sh',
            true,
          )
        case GceActionType.StopVMInstance: {
          await stopInstance(message.output.project, message.output.instance, message.output.zone)
          postClientMessage(messaging, ClientMessages.gcpResourceStatusChanged, {
            resourceId: message.output.instance,
            cellId: message.output.cellId,
            status: InstanceStatusType.Stopping,
            hasErrors: false,
          })
          return waitForInstanceStatus({
            instance: message.output.instance,
            currentStatus: InstanceStatusType.Stopping,
            finalStatus: InstanceStatusType.Terminated,
            project: message.output.project,
            zone: message.output.zone,
            onVMInstanceStatus: (instance: string, status: string, hasErrors, error) => {
              postClientMessage(messaging, ClientMessages.gcpResourceStatusChanged, {
                resourceId: instance,
                cellId: message.output.cellId,
                status,
                hasErrors,
                error,
              })
            },
          })
        }
        case GceActionType.SuspendVMInstance: {
          await suspendInstance(
            message.output.project,
            message.output.instance,
            message.output.zone,
          )

          postClientMessage(messaging, ClientMessages.gcpResourceStatusChanged, {
            resourceId: message.output.instance,
            cellId: message.output.cellId,
            status: InstanceStatusType.Suspending,
            hasErrors: false,
          })

          return waitForInstanceStatus({
            instance: message.output.instance,
            currentStatus: InstanceStatusType.Suspending,
            finalStatus: InstanceStatusType.Suspended,
            project: message.output.project,
            zone: message.output.zone,
            onVMInstanceStatus: (instance: string, status: string, hasErrors, error) => {
              postClientMessage(messaging, ClientMessages.gcpResourceStatusChanged, {
                resourceId: instance,
                cellId: message.output.cellId,
                status,
                hasErrors,
                error,
              })
            },
          })
        }

        case GceActionType.StartVMInstance: {
          await startInstance(
            message.output.project,
            message.output.instance,
            message.output.zone,
            message.output.status,
          )
          postClientMessage(messaging, ClientMessages.gcpResourceStatusChanged, {
            resourceId: message.output.instance,
            cellId: message.output.cellId,
            status: InstanceStatusType.Staging,
            hasErrors: false,
          })
          return waitForInstanceStatus({
            instance: message.output.instance,
            currentStatus: InstanceStatusType.Staging,
            finalStatus: InstanceStatusType.Running,
            project: message.output.project,
            zone: message.output.zone,
            onVMInstanceStatus: (instance: string, status: string, hasErrors, error) => {
              postClientMessage(messaging, ClientMessages.gcpResourceStatusChanged, {
                resourceId: instance,
                cellId: message.output.cellId,
                status,
                hasErrors,
                error,
              })
            },
          })
        }
      }
    }

    default:
      return
  }
}
