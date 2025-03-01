import {
  GetAllWorkflowsDocument,
  GetAllWorkflowsQueryVariables,
} from '../../__generated-platform__/graphql'
import { InitializeCloudClient } from '../../api/client'

export default async function getAllWorkflows({
  fileName,
  minRating,
  limit,
}: GetAllWorkflowsQueryVariables = {}) {
  const graphClient = await InitializeCloudClient()

  if (!limit) {
    limit = 200
  }

  const result = await graphClient.query({
    query: GetAllWorkflowsDocument,
    variables: {
      fileName,
      limit,
      minRating,
    },
  })

  return result
}
