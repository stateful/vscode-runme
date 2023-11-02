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
  htmlUrl: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  input: Scalars['String']['output'];
  isOwner: Scalars['Boolean']['output'];
  isPrivate: Scalars['Boolean']['output'];
  languageId?: Maybe<Scalars['String']['output']>;
  metadata?: Maybe<Metadata>;
  owner?: Maybe<Owner>;
  pid: Scalars['Int']['output'];
  stderr: Scalars['Bytes']['output'];
  stdout: Scalars['Bytes']['output'];
  updateTime: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type CellExecutionInput = {
  autoSave?: InputMaybe<Scalars['Boolean']['input']>;
  exitCode: Scalars['Int']['input'];
  input: Scalars['String']['input'];
  isPrivate?: InputMaybe<Scalars['Boolean']['input']>;
  languageId?: InputMaybe<Scalars['String']['input']>;
  metadata: MetadataInput;
  pid: Scalars['Int']['input'];
  stderr: Scalars['Bytes']['input'];
  stdout: Scalars['Bytes']['input'];
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

export type DocMetadata = {
  __typename?: 'DocMetadata';
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
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
  updateCellExecution?: Maybe<CellExecution>;
  updateSlackInstallation?: Maybe<SlackInstallation>;
};


export type MutationArchiveCellExecutionArgs = {
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


export type MutationUpdateCellExecutionArgs = {
  data: CellExecutionUpdateInput;
  id: Scalars['String']['input'];
  notifySlack?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationUpdateSlackInstallationArgs = {
  data: SlackInstallationUpdateInput;
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
  app_id: Scalars['String']['output'];
  createTime: Scalars['DateTime']['output'];
  default_channel_id?: Maybe<Scalars['String']['output']>;
  default_channel_name?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  scopes: Scalars['String']['output'];
  team_id: Scalars['String']['output'];
  team_name: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
  user?: Maybe<User>;
};

export type SlackInstallationUpdateInput = {
  default_channel_id: Scalars['String']['input'];
  default_channel_name: Scalars['String']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  chat?: Maybe<ChatMessage>;
};

export type User = {
  __typename?: 'User';
  bio?: Maybe<Scalars['String']['output']>;
  /** Cells executed by the user */
  cellExecutions?: Maybe<Array<Maybe<CellExecution>>>;
  company?: Maybe<Scalars['String']['output']>;
  create_time: Scalars['DateTime']['output'];
  displayName?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  emailVerified?: Maybe<Scalars['Boolean']['output']>;
  firebase_refresh_time?: Maybe<Scalars['DateTime']['output']>;
  githubId?: Maybe<Scalars['String']['output']>;
  githubUsername?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  linkedin?: Maybe<Scalars['String']['output']>;
  photoUrl?: Maybe<Scalars['String']['output']>;
  siteAdmin: Scalars['Boolean']['output'];
  siteUrl?: Maybe<Scalars['String']['output']>;
  /** Slack installation for the user */
  slackInstallation?: Maybe<SlackInstallation>;
  twitter?: Maybe<Scalars['String']['output']>;
  update_time: Scalars['DateTime']['output'];
};


export type UserCellExecutionsArgs = {
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  autoSave?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CreateCellExecutionMutationVariables = Exact<{
  data: CellExecutionInput;
}>;


export type CreateCellExecutionMutation = { __typename?: 'Mutation', createCellExecution?: { __typename?: 'CellExecution', id: string, htmlUrl: string } | null };

export type UpdateCellExecutionMutationVariables = Exact<{
  id: Scalars['String']['input'];
  data: CellExecutionUpdateInput;
}>;


export type UpdateCellExecutionMutation = { __typename?: 'Mutation', updateCellExecution?: { __typename?: 'CellExecution', id: string, htmlUrl: string } | null };


export const CreateCellExecutionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCellExecution"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CellExecutionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCellExecution"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"htmlUrl"}}]}}]}}]} as unknown as DocumentNode<CreateCellExecutionMutation, CreateCellExecutionMutationVariables>;
export const UpdateCellExecutionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateCellExecution"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CellExecutionUpdateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateCellExecution"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"htmlUrl"}}]}}]}}]} as unknown as DocumentNode<UpdateCellExecutionMutation, UpdateCellExecutionMutationVariables>;