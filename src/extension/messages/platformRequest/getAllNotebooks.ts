import { GetAllNotebooksDocument } from '../../__generated-platform__/graphql'
import { InitializeCloudClient } from '../../api/client'
import { Kernel } from '../../kernel'

import { APIRequestMessage } from './saveCellExecution'

export default async function getAllNotebooks(
  _requestMessage: APIRequestMessage,
  _kernel: Kernel,
): Promise<void | boolean> {
  const graphClient = await InitializeCloudClient()

  const result = await graphClient.query({
    query: GetAllNotebooksDocument,
    variables: {
      filters: {
        owned: false,
        sharedWithMe: false,
        sharedWithOrg: false,
      },
    },
  })

  console.log(result)
}
