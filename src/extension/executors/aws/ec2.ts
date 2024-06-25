import {
  EC2Client,
  DescribeInstancesCommand,
  type Reservation,
  type Instance,
} from '@aws-sdk/client-ec2'
import { AwsCredentialIdentityProvider } from '@smithy/types'

import { AWSEC2Instance, AWSEC2InstanceDetails } from '../../../types'

function _mapInstanceDetails(instance: Instance): AWSEC2Instance {
  return {
    name: (instance.Tags && instance.Tags.find((tag) => tag.Key === 'Name')?.Value) || 'unnamed',
    instanceId: instance.InstanceId,
    instanceState: instance.State?.Name || 'pending',
    type: instance.InstanceType,
    zone: instance.Placement?.AvailabilityZone || 'unknown',
    publicDns: instance.PublicDnsName,
    publicIp: instance.PublicIpAddress,
    monitoring: instance.Monitoring?.State || 'pending',
    securityGroup:
      (instance.SecurityGroups &&
        instance.SecurityGroups.map((group) => group.GroupName).join(',')) ||
      'none',
    keyName: instance.KeyName,
    launchTime: instance.LaunchTime,
    platform: instance.PlatformDetails,
    lifecycle: instance.InstanceLifecycle,
    ...instance,
  }
}

export async function listEC2Instances(region: string, credentials: AwsCredentialIdentityProvider) {
  const ec2ClientInstance = new EC2Client({
    region,
    credentials,
  })

  const commandResult = await ec2ClientInstance.send(new DescribeInstancesCommand({}))

  if (!commandResult.Reservations?.length) {
    return []
  }

  const instances: AWSEC2Instance[] | undefined = commandResult.Reservations.flatMap(
    (reservation: Reservation) => {
      if (!reservation.Instances) {
        return []
      }
      return reservation.Instances.map((instance: Instance) => _mapInstanceDetails(instance))
    },
  )

  return instances
}

export async function getEC2InstanceDetail(region: string, instanceId: string) {
  const ec2ClientInstance = new EC2Client({
    region,
  })

  const commandResult = await ec2ClientInstance.send(
    new DescribeInstancesCommand({
      InstanceIds: [instanceId],
    }),
  )

  if (!commandResult.Reservations?.length) {
    return
  }

  const instanceDetails: AWSEC2InstanceDetails | undefined = commandResult.Reservations.flatMap(
    (reservation: Reservation) => {
      if (!reservation.Instances) {
        return []
      }
      return {
        instance: reservation.Instances.map((instance: Instance) =>
          _mapInstanceDetails(instance),
        )[0],
        owner: reservation.OwnerId,
      }
    },
  )[0]

  return instanceDetails
}
