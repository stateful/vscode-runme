import { GetOneWorkflowDocument } from '../../__generated-platform__/graphql'
import { InitializeCloudClient } from '../../api/client'
import { Kernel } from '../../kernel'

import { APIRequestMessage } from './saveCellExecution'

export default async function getOneWorkflow(
  _requestMessage: APIRequestMessage,
  _kernel: Kernel,
): Promise<void | boolean> {
  const graphClient = await InitializeCloudClient()

  const result = await graphClient.query({
    query: GetOneWorkflowDocument,
    variables: {
      id: 'fffc4265-5ee8-4bde-81d7-3278fa8766a0',
    },
  })

  console.log(result)
}
