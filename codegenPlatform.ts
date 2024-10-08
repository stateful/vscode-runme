import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  overwrite: true,
  schema: [{
    [process.env.GRAPHQL_SERVER || 'http://0.0.0.0:4000/graphql']: {}
  }],
  documents: ['./src/gql-platform/*.graphql'],
  ignoreNoDocuments: false,
  generates: {
    './src/extension/__generated-platform__/': {
      preset: 'client',
      plugins: [],
    }
  }
}

export default config
