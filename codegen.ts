
import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  overwrite: true,
  schema: [
   {
    [process.env.GRAPHQL_SERVER || 'http://localhost:3002/graphql']: {
      headers: {
        Authorization: `Bearer ${process.env.RUNME_TOKEN}`
      }
    }
   }
  ],
  documents: ['./src/gql/*.graphql'],
  ignoreNoDocuments: false,
  generates: {
    './src/extension/__generated__/': {
      preset: 'client',
      plugins: [],
    }
  }
}

export default config