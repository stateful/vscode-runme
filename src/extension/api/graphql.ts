import { gql } from '@apollo/client'

import { MutationCreateCellExecutionArgs } from '../__generated__/graphql'

export const createCellExecutionQuery = ({ data }: MutationCreateCellExecutionArgs) => {
  const { input, exitCode, stdout, pid, metadata } = data

  return gql(`mutation
        {
            createCellExecution(data: 
                { 
                    input: "${input}", 
                    stdout: ${exitCode === 0 ? stdout : '[]'}, 
                    stderr: ${exitCode !== 0 ? stdout : '[]'}, 
                    pid: ${pid}, 
                    exitCode: ${exitCode},
                    metadata:
                    { 
                        mimeType: "${metadata.mimeType}",
                        category: "${metadata.category || ''}",
                        name: "${metadata.name}"
                    }
                })
            {
                id
                htmlUrl
            }
        }`)
}
