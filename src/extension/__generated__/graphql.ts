/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Bytes: { input: any; output: any; }
  /** A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the `date-time` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar. */
  DateTime: { input: any; output: any; }
};

export type Admin = {
  __typename?: 'Admin';
  users?: Maybe<Array<Maybe<User>>>;
};

export type Anonymous = {
  __typename?: 'Anonymous';
  cellExecution?: Maybe<CellExecution>;
  id?: Maybe<Scalars['String']['output']>;
};


export type AnonymousCellExecutionArgs = {
  id: Scalars['String']['input'];
};

export type Assistant = {
  __typename?: 'Assistant';
  chat?: Maybe<Chat>;
  search?: Maybe<Search>;
};


export type AssistantChatArgs = {
  input: ChatInput;
};


export type AssistantSearchArgs = {
  input: SearchInput;
};

export type CellExecution = {
  __typename?: 'CellExecution';
  archivedTime?: Maybe<Scalars['DateTime']['output']>;
  autoSave: Scalars['Boolean']['output'];
  createTime: Scalars['DateTime']['output'];
  exitCode: Scalars['Int']['output'];
  /** Cell execution history */
  history?: Maybe<Array<Maybe<CellExecution>>>;
  htmlUrl: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  input: Scalars['String']['output'];
  isOwner: Scalars['Boolean']['output'];
  isPrivate: Scalars['Boolean']['output'];
  languageId?: Maybe<Scalars['String']['output']>;
  lifecycleIdentityId?: Maybe<Scalars['String']['output']>;
  metadata?: Maybe<Metadata>;
  notebook?: Maybe<Notebook>;
  owner?: Maybe<Owner>;
  pid: Scalars['Int']['output'];
  stderr: Scalars['Bytes']['output'];
  stdout: Scalars['Bytes']['output'];
  updateTime: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};


export type CellExecutionHistoryArgs = {
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  autoSave?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CellExecutionInput = {
  autoSave?: InputMaybe<Scalars['Boolean']['input']>;
  exitCode: Scalars['Int']['input'];
  id?: InputMaybe<Scalars['String']['input']>;
  input: Scalars['String']['input'];
  isPrivate?: InputMaybe<Scalars['Boolean']['input']>;
  languageId?: InputMaybe<Scalars['String']['input']>;
  metadata: MetadataInput;
  notebook?: InputMaybe<NotebookInput>;
  pid: Scalars['Int']['input'];
  stderr: Scalars['Bytes']['input'];
  stdout: Scalars['Bytes']['input'];
};

export type CellExecutionList = {
  __typename?: 'CellExecutionList';
  data?: Maybe<Array<Maybe<CellExecution>>>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type CellExecutionUpdateInput = {
  isPrivate: Scalars['Boolean']['input'];
};

export type Chat = {
  __typename?: 'Chat';
  commands?: Maybe<Scalars['String']['output']>;
  hits: Array<Hit>;
  question: Scalars['String']['output'];
  response: Scalars['String']['output'];
  session?: Maybe<ChatSession>;
};

export type ChatInput = {
  executableOnly?: InputMaybe<Scalars['Boolean']['input']>;
  question: Scalars['String']['input'];
  session?: InputMaybe<ChatSessionInput>;
};

export type ChatMessage = {
  __typename?: 'ChatMessage';
  done: Scalars['Boolean']['output'];
  message: Scalars['String']['output'];
  token: Scalars['String']['output'];
};

export type ChatSession = {
  __typename?: 'ChatSession';
  collectionName: Scalars['String']['output'];
  expiryMs?: Maybe<Scalars['Int']['output']>;
  expirySecs?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
};

export type ChatSessionInput = {
  id: Scalars['ID']['input'];
};

export type CreateGithubInstallationInput = {
  installation_id: Scalars['Int']['input'];
  setup_action: Scalars['String']['input'];
};

export type DocMetadata = {
  __typename?: 'DocMetadata';
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type GithubInstallation = {
  __typename?: 'GithubInstallation';
  accountAvatarUrl: Scalars['String']['output'];
  accountId: Scalars['Int']['output'];
  accountName: Scalars['String']['output'];
  appId: Scalars['Int']['output'];
  appSlug: Scalars['String']['output'];
  createTime: Scalars['DateTime']['output'];
  documents?: Maybe<Array<Maybe<GithubMarkdown>>>;
  id: Scalars['ID']['output'];
  installationId: Scalars['Int']['output'];
  permissions?: Maybe<GithubInstallationPermissions>;
  repositorySelection: Scalars['String']['output'];
  suspendedAt?: Maybe<Scalars['DateTime']['output']>;
  suspendedBy?: Maybe<Scalars['String']['output']>;
  targetId: Scalars['Int']['output'];
  targetType?: Maybe<Scalars['String']['output']>;
  updateTime: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type GithubInstallationPermissions = {
  __typename?: 'GithubInstallationPermissions';
  contents?: Maybe<Scalars['String']['output']>;
  metadata?: Maybe<Scalars['String']['output']>;
};

export type GithubMarkdown = {
  __typename?: 'GithubMarkdown';
  git_url: Scalars['String']['output'];
  html_url: Scalars['String']['output'];
  name: Scalars['String']['output'];
  path: Scalars['String']['output'];
  repository: GithubRepository;
  sha: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type GithubRepository = {
  __typename?: 'GithubRepository';
  description?: Maybe<Scalars['String']['output']>;
  full_name?: Maybe<Scalars['String']['output']>;
  html_url?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  owner?: Maybe<GithubRepositoryOwner>;
  url?: Maybe<Scalars['String']['output']>;
};

export type GithubRepositoryOwner = {
  __typename?: 'GithubRepositoryOwner';
  avatar_url?: Maybe<Scalars['String']['output']>;
  gravatar_id?: Maybe<Scalars['String']['output']>;
  html_url?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  login?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
};

export type Hit = {
  __typename?: 'Hit';
  distance?: Maybe<Scalars['Float']['output']>;
  document: Scalars['String']['output'];
  metadata: Array<DocMetadata>;
};

export type IdConnect = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type Metadata = {
  __typename?: 'Metadata';
  category?: Maybe<Scalars['String']['output']>;
  endTime?: Maybe<Scalars['Float']['output']>;
  exitType?: Maybe<Scalars['String']['output']>;
  mimeType?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  startTime?: Maybe<Scalars['Float']['output']>;
};

export type MetadataInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  endTime?: InputMaybe<Scalars['Float']['input']>;
  exitType?: InputMaybe<Scalars['String']['input']>;
  mimeType?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  startTime?: InputMaybe<Scalars['Float']['input']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  archiveCellExecution?: Maybe<CellExecution>;
  createCellExecution?: Maybe<CellExecution>;
  deleteCellExecution?: Maybe<CellExecution>;
  deleteSlackInstallation?: Maybe<SlackInstallation>;
  githubInstallation?: Maybe<GithubInstallation>;
  unArchiveCellExecution?: Maybe<CellExecution>;
  updateCellExecution?: Maybe<CellExecution>;
  updateSlackInstallation?: Maybe<SlackInstallation>;
};


export type MutationArchiveCellExecutionArgs = {
  all?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['String']['input'];
};


export type MutationCreateCellExecutionArgs = {
  data: CellExecutionInput;
};


export type MutationDeleteCellExecutionArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteSlackInstallationArgs = {
  id: Scalars['String']['input'];
};


export type MutationGithubInstallationArgs = {
  data: CreateGithubInstallationInput;
};


export type MutationUnArchiveCellExecutionArgs = {
  all?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['String']['input'];
};


export type MutationUpdateCellExecutionArgs = {
  data: CellExecutionUpdateInput;
  id: Scalars['String']['input'];
  notifySlack?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationUpdateSlackInstallationArgs = {
  data: SlackInstallationUpdateInput;
};

export type Notebook = {
  __typename?: 'Notebook';
  createTime: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  runmeVersion: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
};

export type NotebookInput = {
  id?: InputMaybe<Scalars['String']['input']>;
  runmeVersion?: InputMaybe<Scalars['String']['input']>;
};

export type Owner = {
  __typename?: 'Owner';
  bio?: Maybe<Scalars['String']['output']>;
  company?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  githubUsername?: Maybe<Scalars['String']['output']>;
  linkedin?: Maybe<Scalars['String']['output']>;
  photoUrl?: Maybe<Scalars['String']['output']>;
  siteUrl?: Maybe<Scalars['String']['output']>;
  twitter?: Maybe<Scalars['String']['output']>;
};

export type Query = {
  __typename?: 'Query';
  admin?: Maybe<Admin>;
  anonymous?: Maybe<Anonymous>;
  assistant?: Maybe<Assistant>;
  getSlackChannels?: Maybe<Array<Maybe<SlackChannel>>>;
  user?: Maybe<User>;
};


export type QueryUserArgs = {
  id?: InputMaybe<Scalars['String']['input']>;
};

export type Search = {
  __typename?: 'Search';
  hits: Array<Hit>;
  query: Scalars['String']['output'];
  stdev?: Maybe<Scalars['Float']['output']>;
};

export type SearchInput = {
  exclusion?: InputMaybe<Scalars['Boolean']['input']>;
  executableOnly?: InputMaybe<Scalars['Boolean']['input']>;
  expect?: InputMaybe<Scalars['Int']['input']>;
  metadataKeys?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  query: Scalars['String']['input'];
};

export type SlackChannel = {
  __typename?: 'SlackChannel';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type SlackInstallation = {
  __typename?: 'SlackInstallation';
  appId: Scalars['String']['output'];
  createTime: Scalars['DateTime']['output'];
  defaultChannelId?: Maybe<Scalars['String']['output']>;
  defaultChannelName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  scopes: Scalars['String']['output'];
  teamId: Scalars['String']['output'];
  teamName: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
  user?: Maybe<User>;
};

export type SlackInstallationUpdateInput = {
  defaultChannelId: Scalars['String']['input'];
  defaultChannelName: Scalars['String']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  chat?: Maybe<ChatMessage>;
};

export type User = {
  __typename?: 'User';
  bio?: Maybe<Scalars['String']['output']>;
  cellExecution?: Maybe<CellExecution>;
  /** Cells executed by the user */
  cellExecutions?: Maybe<CellExecutionList>;
  company?: Maybe<Scalars['String']['output']>;
  createTime: Scalars['DateTime']['output'];
  displayName?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  emailVerified?: Maybe<Scalars['Boolean']['output']>;
  firebaseRefreshTime?: Maybe<Scalars['DateTime']['output']>;
  githubId?: Maybe<Scalars['String']['output']>;
  /** Github installation for the user */
  githubInstallation?: Maybe<GithubInstallation>;
  githubUsername?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  linkedin?: Maybe<Scalars['String']['output']>;
  photoUrl?: Maybe<Scalars['String']['output']>;
  siteAdmin: Scalars['Boolean']['output'];
  siteUrl?: Maybe<Scalars['String']['output']>;
  /** Slack installation for the user */
  slackInstallation?: Maybe<SlackInstallation>;
  totalActive?: Maybe<Scalars['Int']['output']>;
  totalArchived?: Maybe<Scalars['Int']['output']>;
  twitter?: Maybe<Scalars['String']['output']>;
  updateTime: Scalars['DateTime']['output'];
};


export type UserCellExecutionArgs = {
  id: Scalars['String']['input'];
};


export type UserCellExecutionsArgs = {
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  autoSave?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ArchiveCellExecutionMutationVariables = Exact<{
  archiveCellExecutionId: Scalars['String']['input'];
}>;


export type ArchiveCellExecutionMutation = { __typename?: 'Mutation', archiveCellExecution?: { __typename?: 'CellExecution', id: string } | null };

export type CreateCellExecutionMutationVariables = Exact<{
  data: CellExecutionInput;
}>;


export type CreateCellExecutionMutation = { __typename?: 'Mutation', createCellExecution?: { __typename?: 'CellExecution', id: string, htmlUrl: string, exitCode: number } | null };

export type UnArchiveCellExecutionMutationVariables = Exact<{
  unArchiveCellExecutionId: Scalars['String']['input'];
}>;


export type UnArchiveCellExecutionMutation = { __typename?: 'Mutation', unArchiveCellExecution?: { __typename?: 'CellExecution', id: string } | null };

export type UpdateCellExecutionMutationVariables = Exact<{
  id: Scalars['String']['input'];
  data: CellExecutionUpdateInput;
}>;


export type UpdateCellExecutionMutation = { __typename?: 'Mutation', updateCellExecution?: { __typename?: 'CellExecution', id: string, htmlUrl: string, exitCode: number } | null };


export const ArchiveCellExecutionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ArchiveCellExecution"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"archiveCellExecutionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"archiveCellExecution"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"archiveCellExecutionId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ArchiveCellExecutionMutation, ArchiveCellExecutionMutationVariables>;
export const CreateCellExecutionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCellExecution"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CellExecutionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCellExecution"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"htmlUrl"}},{"kind":"Field","name":{"kind":"Name","value":"exitCode"}}]}}]}}]} as unknown as DocumentNode<CreateCellExecutionMutation, CreateCellExecutionMutationVariables>;
export const UnArchiveCellExecutionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnArchiveCellExecution"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"unArchiveCellExecutionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unArchiveCellExecution"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"unArchiveCellExecutionId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UnArchiveCellExecutionMutation, UnArchiveCellExecutionMutationVariables>;
export const UpdateCellExecutionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateCellExecution"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CellExecutionUpdateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateCellExecution"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"htmlUrl"}},{"kind":"Field","name":{"kind":"Name","value":"exitCode"}}]}}]}}]} as unknown as DocumentNode<UpdateCellExecutionMutation, UpdateCellExecutionMutationVariables>;
