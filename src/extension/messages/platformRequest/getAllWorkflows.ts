import { GetAllWorkflowsDocument } from '../../__generated-platform__/graphql'
import { InitializeCloudClient } from '../../api/client'

type options = {
  fileName?: string
}

export default async function getAllWorkflows({ fileName }: options = {}) {
  const graphClient = await InitializeCloudClient()

  const result = await graphClient.query({
    query: GetAllWorkflowsDocument,
    variables: {
      fileName,
      limit: 50,
    },
  })

  return result
}
