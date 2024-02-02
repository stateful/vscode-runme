import { window } from 'vscode'


import { OutputType } from '../../constants'
import { GKEResolver, GKESupportedView } from '../resolvers/gkeResolver'

import { getClusterDetails, getClusters } from './gke/clusters'

import { IKernelExecutor } from '.'

export const gke: IKernelExecutor = async (executor) => {
  const { doc, exec, outputs } = executor

  try {
    const gkeResolver = new GKEResolver(doc).get()
    if (!gkeResolver?.data.project) {
      throw new Error('Could not resolve Google Kubernetes Engine resource')
    }

    switch (gkeResolver.view) {
      case GKESupportedView.CLUSTERS: {
        const clusters = await getClusters(gkeResolver.data.project)
        outputs.setState({
          type: OutputType.gke,
          state: {
            project: gkeResolver.data.project,
            view: gkeResolver.view,
            cellId: exec.cell.metadata['runme.dev/id'],
            clusters,
          },
        })
        await outputs.showOutput(OutputType.gke)
        break
      }

      case GKESupportedView.CLUSTER: {
        const { cluster, location, project } = gkeResolver.data
        const clusterDetails = await getClusterDetails(cluster, location, project)
        outputs.setState({
          type: OutputType.gke,
          state: {
            project: gkeResolver.data.project,
            view: gkeResolver.view,
            cellId: exec.cell.metadata['runme.dev/id'],
            cluster,
            clusterDetails,
            location,
          },
        })
        await outputs.showOutput(OutputType.gke)
      }
    }
    return true
  } catch (error: any) {
    window.showErrorMessage(`Failed to get Google Kubernetes Engine data, reason: ${error.message}`)
    return false
  }
}
