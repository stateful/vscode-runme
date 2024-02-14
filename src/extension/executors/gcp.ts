import { window } from 'vscode'

import { OutputType } from '../../constants'
import { GCPResolver, GCPSupportedView } from '../resolvers/gcpResolver'

import { getClusterDetails, getClusters } from './gcp/clusters'

import { IKernelExecutor } from '.'

export const gcp: IKernelExecutor = async (executor) => {
  const { doc, exec, outputs } = executor

  try {
    const gcpResolver = new GCPResolver(doc).get()
    if (!gcpResolver?.data.project) {
      throw new Error('Could not resolve Google Kubernetes Engine resource')
    }

    switch (gcpResolver.view) {
      case GCPSupportedView.CLUSTERS: {
        const clusters = await getClusters(gcpResolver.data.project)
        outputs.setState({
          type: OutputType.gcp,
          state: {
            project: gcpResolver.data.project,
            view: gcpResolver.view,
            cellId: exec.cell.metadata['runme.dev/id'],
            clusters,
          },
        })
        await outputs.showOutput(OutputType.gcp)
        break
      }

      case GCPSupportedView.CLUSTER: {
        const { cluster, location, project } = gcpResolver.data
        const clusterDetails = await getClusterDetails(cluster, location, project)
        outputs.setState({
          type: OutputType.gcp,
          state: {
            project: gcpResolver.data.project,
            view: gcpResolver.view,
            cellId: exec.cell.metadata['runme.dev/id'],
            cluster,
            clusterDetails,
            location,
          },
        })
        await outputs.showOutput(OutputType.gcp)
      }
    }
    return true
  } catch (error: any) {
    window.showErrorMessage(`Failed to get Google Kubernetes Engine data, reason: ${error.message}`)
    return false
  }
}
