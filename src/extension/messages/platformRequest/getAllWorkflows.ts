import { GetAllWorkflowsDocument } from '../../__generated-platform__/graphql'
import { InitializeCloudClient } from '../../api/client'

type options = {
  fileName?: string
  limit: number
}

export default async function getAllWorkflows({ fileName, limit }: options = { limit: 200 }) {
  const graphClient = await InitializeCloudClient()

  const result = await graphClient.query({
    query: GetAllWorkflowsDocument,
    variables: {
      fileName,
      limit,
    },
  })

  return result
}
