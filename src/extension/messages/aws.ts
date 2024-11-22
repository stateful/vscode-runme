import path from 'node:path'

import { NotebookEditor, NotebookRendererMessaging } from 'vscode'

import { ClientMessages } from '../../constants'
import { AWSActionType, ClientMessage } from '../../types'
import { insertCodeCell } from '../cell'

export interface AWSStatusMessaging {
  messaging: NotebookRendererMessaging
  message: ClientMessage<ClientMessages>
  editor: NotebookEditor
}

export async function handleAWSMessage({ message, editor }: AWSStatusMessaging): Promise<void> {
  if (
    ![ClientMessages.awsEC2InstanceAction, ClientMessages.awsEKSClusterAction].includes(
      message.type,
    )
  ) {
    return
  }

  switch (message.type) {
    case ClientMessages.awsEC2InstanceAction:
      {
        switch (message.output.action) {
          case AWSActionType.ConnectViaSSH:
            return insertCodeCell(
              message.output.cellId,
              editor,
              'echo "Connecting to instance via SSH..."\n' +
                // eslint-disable-next-line max-len
                `aws ec2-instance-connect ssh --instance-id ${message.output.instance} --region=${message.output.region} --os-user=${message.output.osUser}`,
              'sh',
              true,
            )
          case AWSActionType.EC2InstanceDetails:
            const url = new URL(`https://${message.output.region}.console.aws.amazon.com`)
            url.pathname = path.join('ec2', 'home')
            url.search = `region=${message.output.region}#InstanceDetails:instanceId=${message.output.instance}`
            return insertCodeCell(message.output.cellId, editor, decodeURIComponent(url.toString()))
        }
      }
      break
    case ClientMessages.awsEKSClusterAction: {
      switch (message.output.action) {
        case AWSActionType.EKSClusterDetails:
          const url = new URL(`https://${message.output.region}.console.aws.amazon.com`)
          url.pathname = path.join('eks', 'home')
          url.search = `region=${message.output.region}#/clusters/${message.output.cluster}`
          return insertCodeCell(message.output.cellId, editor, decodeURIComponent(url.toString()))
      }
    }
  }
}
