import {
  EC2Client,
  DescribeInstancesCommand,
  type Reservation,
  type Instance,
  DescribeImagesCommand,
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
    imageName: '',
    ...instance,
  }
}

export async function listEC2Instances(credentials: AwsCredentialIdentityProvider, region: string) {
  const ec2ClientInstance = new EC2Client({
    credentials,
    region,
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

  const describeImagesCommand = new DescribeImagesCommand({
    ImageIds: instances.map((i) => i.ImageId),
  })

  const describeImagesResponse = await ec2ClientInstance.send(describeImagesCommand)

  if (describeImagesResponse.Images) {
    for (const image of describeImagesResponse.Images) {
      const index = instances.findIndex((i) => i.ImageId === image.ImageId)
      if (index >= 0) {
        instances[index].imageName = image.Name!
      }
    }
  }

  return instances
}

export async function getEC2InstanceDetail(
  credentials: AwsCredentialIdentityProvider,
  region: string,
  instanceId: string,
) {
  const ec2ClientInstance = new EC2Client({
    credentials,
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
