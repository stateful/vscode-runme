import { GetAllWorkflowsDocument } from '../../__generated-platform__/graphql'
import { InitializeCloudClient } from '../../api/client'

export default async function getAllWorkflows() {
  const graphClient = await InitializeCloudClient()

  const result = await graphClient.query({
    query: GetAllWorkflowsDocument,
    variables: {
      fileName: 'vscode-runme',
      limit: 50,
    },
  })

  return result
}
