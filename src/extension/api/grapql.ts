import { gql } from '@apollo/client'

export interface CellExecutionMetadata {
  mimeType: string
  category: string
  name: string
}

export interface CellExecutionRequest {
  stdout: any
  input: any
  exitCode: number
  pid: number
  metadata: CellExecutionMetadata
}

export const createCellExecutionQuery = ({
  input,
  exitCode,
  stdout,
  pid,
  metadata,
}: CellExecutionRequest) => {
  return gql`mutation
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
        }`
}
