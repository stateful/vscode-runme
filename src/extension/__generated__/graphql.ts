/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core'
export type Maybe<T> = T | null
export type InputMaybe<T> = Maybe<T>
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> }
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> }
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
  [_ in K]?: never
}
export type Incremental<T> =
  | T
  | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never }
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string }
  String: { input: string; output: string }
  Boolean: { input: boolean; output: boolean }
  Int: { input: number; output: number }
  Float: { input: number; output: number }
  Bytes: { input: any; output: any }
  /** A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the `date-time` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar. */
  DateTime: { input: any; output: any }
}

export type CellExecution = {
  __typename?: 'CellExecution'
  createTime?: Maybe<Scalars['DateTime']['output']>
  exitCode?: Maybe<Scalars['Int']['output']>
  htmlUrl?: Maybe<Scalars['String']['output']>
  id?: Maybe<Scalars['String']['output']>
  input?: Maybe<Scalars['String']['output']>
  metadata?: Maybe<Metadata>
  pid?: Maybe<Scalars['Int']['output']>
  stderr?: Maybe<Scalars['Bytes']['output']>
  stdout?: Maybe<Scalars['Bytes']['output']>
  updateTime?: Maybe<Scalars['DateTime']['output']>
}

export type CellExecutionInput = {
  exitCode: Scalars['Int']['input']
  input: Scalars['String']['input']
  metadata: MetadataInput
  pid: Scalars['Int']['input']
  stderr: Scalars['Bytes']['input']
  stdout: Scalars['Bytes']['input']
}

export type IdConnect = {
  id?: InputMaybe<Scalars['ID']['input']>
}

export type Metadata = {
  __typename?: 'Metadata'
  category?: Maybe<Scalars['String']['output']>
  mimeType?: Maybe<Scalars['String']['output']>
  name?: Maybe<Scalars['String']['output']>
}

export type MetadataInput = {
  category?: InputMaybe<Scalars['String']['input']>
  mimeType?: InputMaybe<Scalars['String']['input']>
  name?: InputMaybe<Scalars['String']['input']>
}

export type Mutation = {
  __typename?: 'Mutation'
  createCellExecution?: Maybe<CellExecution>
  deleteCellExecution?: Maybe<CellExecution>
  updateCellExecution?: Maybe<CellExecution>
}

export type MutationCreateCellExecutionArgs = {
  data: CellExecutionInput
}

export type MutationDeleteCellExecutionArgs = {
  id: Scalars['String']['input']
}

export type MutationUpdateCellExecutionArgs = {
  data: CellExecutionInput
  id: Scalars['String']['input']
}

export type Query = {
  __typename?: 'Query'
  cellExecutionById?: Maybe<CellExecution>
  cellExecutions?: Maybe<Array<Maybe<CellExecution>>>
}

export type QueryCellExecutionByIdArgs = {
  id: Scalars['String']['input']
}

export type CreateCellExecutionMutationVariables = Exact<{
  data: CellExecutionInput
}>

export type CreateCellExecutionMutation = {
  __typename?: 'Mutation'
  createCellExecution?: {
    __typename?: 'CellExecution'
    input?: string | null
    pid?: number | null
    stderr?: any | null
    stdout?: any | null
    exitCode?: number | null
    metadata?: {
      __typename?: 'Metadata'
      category?: string | null
      mimeType?: string | null
      name?: string | null
    } | null
  } | null
}

export const CreateCellExecutionDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreateCellExecution' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'data' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'CellExecutionInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createCellExecution' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'data' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'data' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'input' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'metadata' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'mimeType' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'pid' } },
                { kind: 'Field', name: { kind: 'Name', value: 'stderr' } },
                { kind: 'Field', name: { kind: 'Name', value: 'stdout' } },
                { kind: 'Field', name: { kind: 'Name', value: 'exitCode' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateCellExecutionMutation, CreateCellExecutionMutationVariables>
