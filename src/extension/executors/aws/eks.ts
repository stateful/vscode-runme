import { EKSClient, ListClustersCommand, DescribeClusterCommand } from '@aws-sdk/client-eks'

import { type IndexableCluster } from './types'

export async function listClusters(region: string) {
  const eksClient = new EKSClient({
    region,
  })

  const commandResult = await eksClient.send(new ListClustersCommand())

  if (!commandResult.clusters?.length) {
    return []
  }

  const clusters: IndexableCluster[] = []

  for await (const cluster of commandResult.clusters) {
    const details = await eksClient.send(
      new DescribeClusterCommand({
        name: cluster,
      }),
    )
    if (details.cluster) {
      clusters.push(details.cluster)
    }
  }

  return clusters
}

export async function getCluster(region: string, clusterName: string) {
  const eksClient = new EKSClient({
    region,
  })

  const commandResult = await eksClient.send(
    new DescribeClusterCommand({
      name: clusterName,
    }),
  )

  return commandResult.cluster
}
