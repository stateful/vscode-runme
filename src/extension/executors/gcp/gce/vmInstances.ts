import path from 'node:path'

import compute from '@google-cloud/compute'

import { getGCloudLink } from '../utils'
import { GcpGceVMInstance, InstancePool, InstanceStatusType } from '../../../../types'

export type OnVMInstanceStatusUpdate = (
  instance: string,
  status: string,
  hasErrors: boolean,
  error?: string | undefined,
) => void

export interface VMInstanceStatus {
  instance: string
  currentStatus: string
  finalStatus: string
  project: string
  zone: string
  onVMInstanceStatus: OnVMInstanceStatusUpdate
}

export async function getVMInstances(project: string): Promise<GcpGceVMInstance[]> {
  const instancesClient = new compute.v1.InstancesClient()
  const targetPoolsClient = new compute.v1.TargetPoolsClient()

  const instancesIterable = instancesClient.aggregatedListAsync({
    project,
  })
  const results: any[] | PromiseLike<GcpGceVMInstance[]> = []

  for await (const [zone, { instances }] of instancesIterable) {
    if (instances?.length) {
      const zoneName = zone.split('/')[1]

      const [country, location] = zoneName.split('-')
      const poolRegion = `${country}-${location}`

      const [pools] = await targetPoolsClient.list({
        project,
        region: poolRegion,
      })

      instances.forEach((instance) => {
        let instancePools: InstancePool[] | undefined
        if (instance.selfLink) {
          instancePools = pools
            .filter((pool) => pool.instances?.includes(instance.selfLink!))
            .map((pool) => {
              return {
                name: pool.name,
                link: getGCloudLink(
                  path.join(
                    'net-services',
                    'loadbalancing',
                    'advanced',
                    'targetPools',
                    'details',
                    'regions',
                    poolRegion,
                    'targetPools',
                    `${pool.name!}?project=${project}`,
                  ),
                ),
              }
            }) as InstancePool[]
        }

        const { accessConfigs, networkIP, name } = (instance.networkInterfaces || [])[0]
        results.push({
          instanceId: instance.id,
          status: (instance as any).status,
          name: instance.name,
          zone: zoneName,
          network: {
            name,
            interfaceLink: getGCloudLink(
              path.join(
                'networking',
                'networkinterfaces',
                'zones',
                zoneName,
                'instances',
                `${instance.name!}?networkInterface=${name}&project=${project}`,
              ),
            ),
            internal: {
              ip: networkIP,
            },
            external: {
              ip: (accessConfigs?.length && accessConfigs[0].natIP) || 'unassigned',
            },
          },
          pools: instancePools,
        })
      })
    }
  }

  return results
}

export async function stopInstance(project: string, instance: string, zone: string) {
  const instancesClient = new compute.v1.InstancesClient()
  return instancesClient.stop({
    project,
    instance,
    zone,
  })
}

export async function suspendInstance(project: string, instance: string, zone: string) {
  const instancesClient = new compute.v1.InstancesClient()
  return instancesClient.suspend({
    project,
    instance,
    zone,
  })
}

export async function startInstance(
  project: string,
  instance: string,
  zone: string,
  currentStatus: InstanceStatusType,
) {
  const instancesClient = new compute.v1.InstancesClient()
  if (currentStatus === InstanceStatusType.Suspended) {
    return instancesClient.resume({
      project,
      instance,
      zone,
    })
  }
  return instancesClient.start({
    project,
    instance,
    zone,
  })
}

export async function getVMInstance(project: string, instance: string, zone: string) {
  try {
    const instancesClient = new compute.v1.InstancesClient()
    const instanceResult = instancesClient.get({
      project,
      zone,
      instance,
    })
    return instanceResult
  } catch {
    return []
  }
}

/**
 * Waits until a vm instance status is in final state
 */
export async function waitForInstanceStatus({
  currentStatus,
  instance,
  project,
  zone,
  finalStatus,
  onVMInstanceStatus,
}: VMInstanceStatus) {
  if (finalStatus === currentStatus) {
    return onVMInstanceStatus(instance, currentStatus, false)
  }
  try {
    const [vmInstance] = await getVMInstance(project, instance, zone)
    if (!vmInstance || !vmInstance.status) {
      return onVMInstanceStatus(instance, 'DELETED', false)
    }
    return waitForInstanceStatus({
      instance,
      finalStatus,
      currentStatus: vmInstance.status,
      project,
      zone,
      onVMInstanceStatus,
    })
  } catch (error) {
    return onVMInstanceStatus(instance, currentStatus, true, (error as any).message)
  }
}
