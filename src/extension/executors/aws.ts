import { window } from 'vscode'

import { OutputType } from '../../constants'
import { AWSResolver, AWSSupportedView } from '../resolvers/awsResolver'

import { getEC2InstanceDetail, listEC2Instances } from './aws/ec2'

import { IKernelExecutor } from '.'

export const aws: IKernelExecutor = async (executor) => {
  const { doc, exec, outputs } = executor

  try {
    const awsResolver = new AWSResolver(doc).get()
    if (!awsResolver?.data.region) {
      throw new Error('Could not resolve AWS resource')
    }

    switch (awsResolver.view) {
      case AWSSupportedView.EC2Instances: {
        const instances = await listEC2Instances(awsResolver.data.region)
        outputs.setState({
          type: OutputType.aws,
          state: {
            cellId: exec.cell.metadata['runme.dev/id'],
            view: awsResolver.view,
            region: awsResolver.data.region,
            instances,
          },
        })
        await outputs.showOutput(OutputType.aws)
        break
      }

      case AWSSupportedView.EC2InstanceDetails: {
        const instanceDetails = await getEC2InstanceDetail(
          awsResolver.data.region,
          awsResolver.data.instanceId!,
        )
        outputs.setState({
          type: OutputType.aws,
          state: {
            cellId: exec.cell.metadata['runme.dev/id'],
            view: awsResolver.view,
            region: awsResolver.data.region,
            instanceDetails,
          },
        })
        await outputs.showOutput(OutputType.aws)
        break
      }
    }
    return true
  } catch (error: any) {
    window.showErrorMessage(`Failed to get AWS data, reason: ${error.message}`)
    return false
  }
}
