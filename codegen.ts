
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: process.env.GRAPHQL_SERVER,
  documents: ['./src/gql/*.graphql'],
  ignoreNoDocuments: true,
  generates: {
    "./src/extension/__generated__/": {
      preset: 'client',
      plugins: [],
    },
    "./graphql.schema.json": {
      plugins: ["introspection"]
    }
  }
};

export default config;