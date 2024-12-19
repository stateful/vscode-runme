import { GetOneWorkflowDocument } from '../../__generated-platform__/graphql'
import { InitializeCloudClient } from '../../api/client'

export default async function getOneWorkflow(id: string) {
  const graphClient = await InitializeCloudClient()

  return await graphClient.query({
    query: GetOneWorkflowDocument,
    variables: {
      id,
    },
  })
}
