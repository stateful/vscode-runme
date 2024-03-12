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
  /** The `BigInt` scalar type represents non-fractional signed whole numeric values. */
  BigInt: { input: any; output: any; }
  /** The `Byte` scalar type represents byte value as a Buffer */
  Byte: { input: any; output: any; }
  Bytes: { input: any; output: any; }
  /** A date string, such as 2007-12-03, compliant with the `full-date` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar. */
  Date: { input: any; output: any; }
  /** A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the `date-time` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar. */
  DateTime: { input: any; output: any; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: any; output: any; }
  /** The `JSONObject` scalar type represents JSON objects as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSONObject: { input: any; output: any; }
  /** A time string at UTC, such as 10:15:30Z, compliant with the `full-time` format outlined in section 5.6 of the RFC 3339profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar. */
  Time: { input: any; output: any; }
};

export type AddUserToOrganizationInput = {
  id: Scalars['String']['input'];
  userId: Scalars['String']['input'];
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
  cellExecutionShares?: Maybe<Array<Maybe<CellExecutionShare>>>;
  createTime: Scalars['DateTime']['output'];
  exitCode: Scalars['Int']['output'];
  history?: Maybe<Array<Maybe<CellExecution>>>;
  htmlUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  input?: Maybe<Scalars['String']['output']>;
  inputData?: Maybe<Scalars['Bytes']['output']>;
  isOwner?: Maybe<Scalars['Boolean']['output']>;
  languageId?: Maybe<Scalars['String']['output']>;
  lifecycleIdentityId?: Maybe<Scalars['String']['output']>;
  metadata?: Maybe<Metadata>;
  notebook?: Maybe<Notebook>;
  notebookId?: Maybe<Scalars['String']['output']>;
  organizationId?: Maybe<Scalars['String']['output']>;
  owner?: Maybe<Owner>;
  pid?: Maybe<Scalars['Int']['output']>;
  shareType?: Maybe<ShareType>;
  stderr?: Maybe<Scalars['Bytes']['output']>;
  stderrData?: Maybe<Scalars['Bytes']['output']>;
  stdout?: Maybe<Scalars['Bytes']['output']>;
  stdoutData?: Maybe<Scalars['Bytes']['output']>;
  updateTime?: Maybe<Scalars['DateTime']['output']>;
  user: User;
  userId: Scalars['String']['output'];
};


export type CellExecutionHistoryArgs = {
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  autoSave?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CellExecutionList = {
  __typename?: 'CellExecutionList';
  data?: Maybe<Array<Maybe<CellExecution>>>;
  totalActive?: Maybe<Scalars['Int']['output']>;
  totalArchived?: Maybe<Scalars['Int']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type CellExecutionShare = {
  __typename?: 'CellExecutionShare';
  cellExecution: CellExecution;
  cellExecutionId: Scalars['String']['output'];
  group?: Maybe<Group>;
  groupId?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  sharedBy: User;
  sharedById: Scalars['String']['output'];
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
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

export type CreateCellExecutionInput = {
  archivedTime?: InputMaybe<Scalars['DateTime']['input']>;
  autoSave?: InputMaybe<Scalars['Boolean']['input']>;
  createTime?: InputMaybe<Scalars['DateTime']['input']>;
  exitCode?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  input: Scalars['Bytes']['input'];
  languageId?: InputMaybe<Scalars['String']['input']>;
  metadata: MetadataInput;
  notebook?: InputMaybe<CreateNotebookInput>;
  pid: Scalars['Int']['input'];
  shareType?: InputMaybe<ShareType>;
  stderr: Scalars['Bytes']['input'];
  stdout: Scalars['Bytes']['input'];
  updateTime?: InputMaybe<Scalars['DateTime']['input']>;
};

export type CreateCellExecutionShareInput = {
  cellExecutionId: Scalars['String']['input'];
  groupId?: InputMaybe<Scalars['String']['input']>;
  sharedById: Scalars['String']['input'];
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type CreateGithubInstallationInput = {
  accountAvatarUrl: Scalars['String']['input'];
  accountId: Scalars['Int']['input'];
  accountName: Scalars['String']['input'];
  appId: Scalars['Int']['input'];
  appSlug: Scalars['String']['input'];
  createTime?: InputMaybe<Scalars['DateTime']['input']>;
  installationId: Scalars['Int']['input'];
  permissions: Scalars['JSON']['input'];
  repositorySelection: Scalars['String']['input'];
  suspendedAt?: InputMaybe<Scalars['DateTime']['input']>;
  suspendedBy?: InputMaybe<Scalars['String']['input']>;
  targetId: Scalars['Int']['input'];
  targetType: GithubTargetType;
  updateTime: Scalars['DateTime']['input'];
  userId: Scalars['String']['input'];
};

export type CreateGroupInput = {
  name: Scalars['String']['input'];
  userIds: Array<InputMaybe<Scalars['String']['input']>>;
};

export type CreateGroupUserInput = {
  groupId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};

export type CreateNotebookInput = {
  id: Scalars['String']['input'];
  runmeVersion: Scalars['String']['input'];
};

export type CreateOrganizationInput = {
  createTime: Scalars['DateTime']['input'];
  name: Scalars['String']['input'];
  updateTime: Scalars['DateTime']['input'];
};

export type CreateOrganizationUserInput = {
  organizationId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};

export type CreateSlackInstallationInput = {
  appId: Scalars['String']['input'];
  createTime?: InputMaybe<Scalars['DateTime']['input']>;
  data: Scalars['JSON']['input'];
  defaultChannelId?: InputMaybe<Scalars['String']['input']>;
  defaultChannelName?: InputMaybe<Scalars['String']['input']>;
  scopes: Scalars['String']['input'];
  teamId: Scalars['String']['input'];
  teamName: Scalars['String']['input'];
  token: Scalars['Bytes']['input'];
  tokenType?: InputMaybe<SlackTokenType>;
  updateTime?: InputMaybe<Scalars['DateTime']['input']>;
  userId: Scalars['String']['input'];
};

export type CreateUserInput = {
  auth0Id?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  company?: InputMaybe<Scalars['String']['input']>;
  createTime?: InputMaybe<Scalars['DateTime']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  emailVerified?: InputMaybe<Scalars['Boolean']['input']>;
  firebaseRefreshTime?: InputMaybe<Scalars['DateTime']['input']>;
  githubId?: InputMaybe<Scalars['String']['input']>;
  githubRefreshTime?: InputMaybe<Scalars['DateTime']['input']>;
  githubUsername?: InputMaybe<Scalars['String']['input']>;
  googleId?: InputMaybe<Scalars['String']['input']>;
  googleRefreshTime?: InputMaybe<Scalars['DateTime']['input']>;
  linkedin?: InputMaybe<Scalars['String']['input']>;
  microsoftId?: InputMaybe<Scalars['String']['input']>;
  microsoftRefreshTime?: InputMaybe<Scalars['DateTime']['input']>;
  photoUrl?: InputMaybe<Scalars['String']['input']>;
  signupOrigin?: InputMaybe<SignupOrigin>;
  siteAdmin?: InputMaybe<Scalars['Boolean']['input']>;
  siteUrl?: InputMaybe<Scalars['String']['input']>;
  twitter?: InputMaybe<Scalars['String']['input']>;
  updateTime?: InputMaybe<Scalars['DateTime']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
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
  id: Scalars['String']['output'];
  installationId: Scalars['Int']['output'];
  permissions: GithubInstallationPermissions;
  repositorySelection: Scalars['String']['output'];
  suspendedAt?: Maybe<Scalars['DateTime']['output']>;
  suspendedBy?: Maybe<Scalars['String']['output']>;
  targetId: Scalars['Int']['output'];
  targetType: GithubTargetType;
  updateTime: Scalars['DateTime']['output'];
  user: User;
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

export enum GithubTargetType {
  GithubOrganization = 'GITHUB_ORGANIZATION',
  GithubUser = 'GITHUB_USER'
}

export type Group = {
  __typename?: 'Group';
  createTime: Scalars['DateTime']['output'];
  groupUsers: Array<Maybe<GroupUser>>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  organization: Organization;
  organizationId: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
};

export type GroupUser = {
  __typename?: 'GroupUser';
  group: Group;
  groupId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

export type HandleGithubInstallationInput = {
  installationId: Scalars['Int']['input'];
  setupAction: Scalars['String']['input'];
};

export type Hit = {
  __typename?: 'Hit';
  distance?: Maybe<Scalars['Float']['output']>;
  document: Scalars['String']['output'];
  metadata: Array<DocMetadata>;
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
  addUserToOrganization: Organization;
  archiveCellExecution?: Maybe<CellExecution>;
  createCellExecution: CellExecution;
  createGroup: Group;
  createOrganization: Organization;
  deleteCellExecution: CellExecution;
  deleteGroup: Group;
  deleteOrganization: Organization;
  handleGithubInstallation: GithubInstallation;
  removeUserFromOrganization: Organization;
  shareCellExecution: CellExecution;
  unArchiveCellExecution?: Maybe<CellExecution>;
  updateCellExecution: CellExecution;
  updateGroup: Group;
  updateOrganization: Organization;
  updateSlackInstallation: SlackInstallation;
};


export type MutationAddUserToOrganizationArgs = {
  input: AddUserToOrganizationInput;
};


export type MutationArchiveCellExecutionArgs = {
  all?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['String']['input'];
};


export type MutationCreateCellExecutionArgs = {
  input: CreateCellExecutionInput;
};


export type MutationCreateGroupArgs = {
  input: CreateGroupInput;
};


export type MutationCreateOrganizationArgs = {
  input: CreateOrganizationInput;
};


export type MutationDeleteCellExecutionArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteGroupArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteOrganizationArgs = {
  id: Scalars['String']['input'];
};


export type MutationHandleGithubInstallationArgs = {
  input: HandleGithubInstallationInput;
};


export type MutationRemoveUserFromOrganizationArgs = {
  input: RemoveUserFromOrganization;
};


export type MutationShareCellExecutionArgs = {
  id: Scalars['String']['input'];
  input: ShareCellExecutionInput;
};


export type MutationUnArchiveCellExecutionArgs = {
  all?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['String']['input'];
};


export type MutationUpdateCellExecutionArgs = {
  id: Scalars['String']['input'];
  input: UpdateCellExecutionInput;
  notifySlack?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationUpdateGroupArgs = {
  id: Scalars['String']['input'];
  input: UpdateGroupInput;
};


export type MutationUpdateOrganizationArgs = {
  id: Scalars['String']['input'];
  input: UpdateOrganizationInput;
};


export type MutationUpdateSlackInstallationArgs = {
  input: UpdateSlackInstallationInput;
};

export type Notebook = {
  __typename?: 'Notebook';
  cellExecutions?: Maybe<Array<Maybe<CellExecution>>>;
  createTime?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['String']['output'];
  runmeVersion?: Maybe<Scalars['String']['output']>;
  updateTime?: Maybe<Scalars['DateTime']['output']>;
  user: User;
  userId: Scalars['String']['output'];
};

export type Organization = {
  __typename?: 'Organization';
  createTime: Scalars['DateTime']['output'];
  groups: Array<Maybe<Group>>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  organizationUsers: Array<Maybe<OrganizationUser>>;
  updateTime: Scalars['DateTime']['output'];
};

export type OrganizationUser = {
  __typename?: 'OrganizationUser';
  id: Scalars['String']['output'];
  organization: Organization;
  organizationId: Scalars['String']['output'];
  user: User;
  userId: Scalars['String']['output'];
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

/** About the Redwood queries. */
export type Query = {
  __typename?: 'Query';
  assistant?: Maybe<Assistant>;
  cellExecution?: Maybe<CellExecution>;
  cellExecutions: CellExecutionList;
  getSlackChannels?: Maybe<Array<Maybe<SlackChannel>>>;
  githubInstallation?: Maybe<GithubInstallation>;
  group?: Maybe<Group>;
  groups: Array<Group>;
  organization?: Maybe<Organization>;
  organizations: Array<Organization>;
  /** Fetches the Redwood root schema. */
  redwood?: Maybe<Redwood>;
  slackInstallation?: Maybe<SlackInstallation>;
};


/** About the Redwood queries. */
export type QueryCellExecutionArgs = {
  id: Scalars['String']['input'];
};


/** About the Redwood queries. */
export type QueryCellExecutionsArgs = {
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  autoSave?: InputMaybe<Scalars['Boolean']['input']>;
};


/** About the Redwood queries. */
export type QueryGroupArgs = {
  id: Scalars['String']['input'];
};


/** About the Redwood queries. */
export type QueryOrganizationArgs = {
  id: Scalars['String']['input'];
};

/**
 * The RedwoodJS Root Schema
 *
 * Defines details about RedwoodJS such as the current user and version information.
 */
export type Redwood = {
  __typename?: 'Redwood';
  /** The current user. */
  currentUser?: Maybe<Scalars['JSON']['output']>;
  /** The version of Prisma. */
  prismaVersion?: Maybe<Scalars['String']['output']>;
  /** The version of Redwood. */
  version?: Maybe<Scalars['String']['output']>;
};

export type RemoveUserFromOrganization = {
  id: Scalars['String']['input'];
  userId: Scalars['String']['input'];
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

export type ShareCellExecutionInput = {
  groupIds?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  notify?: InputMaybe<Scalars['Boolean']['input']>;
  shareType: ShareType;
  userEmails?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export enum ShareType {
  Organization = 'ORGANIZATION',
  Public = 'PUBLIC',
  Restricted = 'RESTRICTED'
}

export enum SignupOrigin {
  RunmeApp = 'RUNME_APP',
  RunmeCli = 'RUNME_CLI',
  RunmeFirebase = 'RUNME_FIREBASE',
  RunmeVscode = 'RUNME_VSCODE',
  Unknown = 'UNKNOWN'
}

export type SlackChannel = {
  __typename?: 'SlackChannel';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type SlackInstallation = {
  __typename?: 'SlackInstallation';
  appId: Scalars['String']['output'];
  createTime: Scalars['DateTime']['output'];
  data: Scalars['JSON']['output'];
  defaultChannelId?: Maybe<Scalars['String']['output']>;
  defaultChannelName?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  scopes: Scalars['String']['output'];
  teamId: Scalars['String']['output'];
  teamName: Scalars['String']['output'];
  token: Scalars['Bytes']['output'];
  tokenType?: Maybe<SlackTokenType>;
  updateTime: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

export enum SlackTokenType {
  SlackBot = 'SLACK_BOT',
  SlackUser = 'SLACK_USER'
}

export type Subscription = {
  __typename?: 'Subscription';
  chat?: Maybe<ChatMessage>;
};

export type UpdateCellExecutionInput = {
  isPrivate?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateCellExecutionShareInput = {
  cellExecutionId?: InputMaybe<Scalars['String']['input']>;
  groupId?: InputMaybe<Scalars['String']['input']>;
  sharedById?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateGithubInstallationInput = {
  accountAvatarUrl?: InputMaybe<Scalars['String']['input']>;
  accountId?: InputMaybe<Scalars['Int']['input']>;
  accountName?: InputMaybe<Scalars['String']['input']>;
  appId?: InputMaybe<Scalars['Int']['input']>;
  appSlug?: InputMaybe<Scalars['String']['input']>;
  createTime?: InputMaybe<Scalars['DateTime']['input']>;
  installationId?: InputMaybe<Scalars['Int']['input']>;
  permissions?: InputMaybe<Scalars['JSON']['input']>;
  repositorySelection?: InputMaybe<Scalars['String']['input']>;
  suspendedAt?: InputMaybe<Scalars['DateTime']['input']>;
  suspendedBy?: InputMaybe<Scalars['String']['input']>;
  targetId?: InputMaybe<Scalars['Int']['input']>;
  targetType?: InputMaybe<GithubTargetType>;
  updateTime?: InputMaybe<Scalars['DateTime']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateGroupInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  userIds?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type UpdateGroupUserInput = {
  groupId?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateNotebookInput = {
  createTime?: InputMaybe<Scalars['DateTime']['input']>;
  runmeVersion?: InputMaybe<Scalars['String']['input']>;
  updateTime?: InputMaybe<Scalars['DateTime']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOrganizationInput = {
  createTime?: InputMaybe<Scalars['DateTime']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  updateTime?: InputMaybe<Scalars['DateTime']['input']>;
};

export type UpdateOrganizationUserInput = {
  organizationId?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateSlackInstallationInput = {
  defaultChannelId?: InputMaybe<Scalars['String']['input']>;
  defaultChannelName?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUserInput = {
  auth0Id?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  company?: InputMaybe<Scalars['String']['input']>;
  createTime?: InputMaybe<Scalars['DateTime']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  emailVerified?: InputMaybe<Scalars['Boolean']['input']>;
  firebaseRefreshTime?: InputMaybe<Scalars['DateTime']['input']>;
  githubId?: InputMaybe<Scalars['String']['input']>;
  githubRefreshTime?: InputMaybe<Scalars['DateTime']['input']>;
  githubUsername?: InputMaybe<Scalars['String']['input']>;
  googleId?: InputMaybe<Scalars['String']['input']>;
  googleRefreshTime?: InputMaybe<Scalars['DateTime']['input']>;
  linkedin?: InputMaybe<Scalars['String']['input']>;
  microsoftId?: InputMaybe<Scalars['String']['input']>;
  microsoftRefreshTime?: InputMaybe<Scalars['DateTime']['input']>;
  photoUrl?: InputMaybe<Scalars['String']['input']>;
  signupOrigin?: InputMaybe<SignupOrigin>;
  siteAdmin?: InputMaybe<Scalars['Boolean']['input']>;
  siteUrl?: InputMaybe<Scalars['String']['input']>;
  twitter?: InputMaybe<Scalars['String']['input']>;
  updateTime?: InputMaybe<Scalars['DateTime']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  Notebook: Array<Maybe<Notebook>>;
  SlackInstallations: Array<Maybe<SlackInstallation>>;
  auth0Id?: Maybe<Scalars['String']['output']>;
  bio?: Maybe<Scalars['String']['output']>;
  cellExecutions: Array<Maybe<CellExecution>>;
  company?: Maybe<Scalars['String']['output']>;
  createTime?: Maybe<Scalars['DateTime']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  emailVerified?: Maybe<Scalars['Boolean']['output']>;
  firebaseRefreshTime?: Maybe<Scalars['DateTime']['output']>;
  githubId?: Maybe<Scalars['String']['output']>;
  githubInstallations: Array<Maybe<GithubInstallation>>;
  githubRefreshTime?: Maybe<Scalars['DateTime']['output']>;
  githubUsername?: Maybe<Scalars['String']['output']>;
  googleId?: Maybe<Scalars['String']['output']>;
  googleRefreshTime?: Maybe<Scalars['DateTime']['output']>;
  groupUsers?: Maybe<Array<Maybe<GroupUser>>>;
  id: Scalars['String']['output'];
  linkedin?: Maybe<Scalars['String']['output']>;
  microsoftId?: Maybe<Scalars['String']['output']>;
  microsoftRefreshTime?: Maybe<Scalars['DateTime']['output']>;
  photoUrl?: Maybe<Scalars['String']['output']>;
  signupOrigin?: Maybe<SignupOrigin>;
  siteAdmin?: Maybe<Scalars['Boolean']['output']>;
  siteUrl?: Maybe<Scalars['String']['output']>;
  twitter?: Maybe<Scalars['String']['output']>;
  updateTime?: Maybe<Scalars['DateTime']['output']>;
  username?: Maybe<Scalars['String']['output']>;
};

export type ArchiveCellExecutionMutationVariables = Exact<{
  archiveCellExecutionId: Scalars['String']['input'];
}>;


export type ArchiveCellExecutionMutation = { __typename?: 'Mutation', archiveCellExecution?: { __typename?: 'CellExecution', id: string } | null };

export type CreateCellExecutionMutationVariables = Exact<{
  input: CreateCellExecutionInput;
}>;


export type CreateCellExecutionMutation = { __typename?: 'Mutation', createCellExecution: { __typename?: 'CellExecution', id: string, htmlUrl?: string | null, exitCode: number } };

export type UpdateCellExecutionMutationVariables = Exact<{
  id: Scalars['String']['input'];
  input: UpdateCellExecutionInput;
}>;


export type UpdateCellExecutionMutation = { __typename?: 'Mutation', updateCellExecution: { __typename?: 'CellExecution', id: string, htmlUrl?: string | null, exitCode: number } };


export const ArchiveCellExecutionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ArchiveCellExecution"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"archiveCellExecutionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"archiveCellExecution"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"archiveCellExecutionId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ArchiveCellExecutionMutation, ArchiveCellExecutionMutationVariables>;
export const CreateCellExecutionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCellExecution"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateCellExecutionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCellExecution"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"htmlUrl"}},{"kind":"Field","name":{"kind":"Name","value":"exitCode"}}]}}]}}]} as unknown as DocumentNode<CreateCellExecutionMutation, CreateCellExecutionMutationVariables>;
export const UpdateCellExecutionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateCellExecution"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateCellExecutionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateCellExecution"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"htmlUrl"}},{"kind":"Field","name":{"kind":"Name","value":"exitCode"}}]}}]}}]} as unknown as DocumentNode<UpdateCellExecutionMutation, UpdateCellExecutionMutationVariables>;