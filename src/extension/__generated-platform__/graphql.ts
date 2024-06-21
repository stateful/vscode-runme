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
  IntOrString: { input: any; output: any; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: any; output: any; }
  /** The `JSONObject` scalar type represents JSON objects as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSONObject: { input: any; output: any; }
  /** A time string at UTC, such as 10:15:30Z, compliant with the `full-time` format outlined in section 5.6 of the RFC 3339profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar. */
  Time: { input: any; output: any; }
};

export type AccessRequest = {
  __typename?: 'AccessRequest';
  cellOutput?: Maybe<CellOutput>;
  createTime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  referenceId: Scalars['String']['output'];
  referenceTable: Scalars['String']['output'];
  requestedBy?: Maybe<User>;
  requestedById?: Maybe<Scalars['String']['output']>;
  status: AccessRequestStatus;
  updateTime: Scalars['DateTime']['output'];
};

export enum AccessRequestStatus {
  Accepted = 'ACCEPTED',
  Pending = 'PENDING',
  Rejected = 'REJECTED'
}

export type AddUserToOrganizationInput = {
  id: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};

export type AnalyticFilterInput = {
  range: AnalyticRanges;
  teamId?: InputMaybe<Scalars['String']['input']>;
  xAxis?: InputMaybe<Array<InputMaybe<Scalars['IntOrString']['input']>>>;
};

export enum AnalyticRanges {
  Bimonthly = 'Bimonthly',
  Monthly = 'Monthly',
  Quarterly = 'Quarterly',
  Weekly = 'Weekly'
}

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

export type AxisData = {
  __typename?: 'AxisData';
  date: Scalars['DateTime']['output'];
  xAxis?: Maybe<Scalars['IntOrString']['output']>;
  yAxis?: Maybe<Scalars['Int']['output']>;
};

export type AxisStat = {
  __typename?: 'AxisStat';
  data: Array<Maybe<AxisData>>;
  legends?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type Cell = {
  __typename?: 'Cell';
  cellOutputs?: Maybe<Array<Maybe<CellOutput>>>;
  id: Scalars['String']['output'];
  mainCellOutput?: Maybe<CellOutput>;
  notebook?: Maybe<Notebook>;
  notebookId: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  organizationId?: Maybe<Scalars['String']['output']>;
  totalOutputs?: Maybe<Scalars['Int']['output']>;
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type CellAttachment = {
  __typename?: 'CellAttachment';
  cell: Cell;
  cellId: Scalars['String']['output'];
  createTime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  organizationId?: Maybe<Scalars['String']['output']>;
  size: Scalars['Int']['output'];
  type: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
};

export type CellExecution = {
  __typename?: 'CellExecution';
  archivedTime?: Maybe<Scalars['DateTime']['output']>;
  autoSave: Scalars['Boolean']['output'];
  createTime: Scalars['DateTime']['output'];
  exitCode: Scalars['Int']['output'];
  history?: Maybe<Array<Maybe<CellExecution>>>;
  htmlUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  input?: Maybe<Scalars['String']['output']>;
  inputData?: Maybe<Scalars['Bytes']['output']>;
  isOwner?: Maybe<Scalars['Boolean']['output']>;
  isSlackReady: Scalars['Boolean']['output'];
  languageId?: Maybe<Scalars['String']['output']>;
  lifecycleIdentityId?: Maybe<Scalars['String']['output']>;
  maskedInput?: Maybe<Scalars['String']['output']>;
  maskedStderr?: Maybe<Scalars['Bytes']['output']>;
  maskedStdout?: Maybe<Scalars['Bytes']['output']>;
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
  unmaskable: Scalars['Boolean']['output'];
  updateTime?: Maybe<Scalars['DateTime']['output']>;
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};


export type CellExecutionHistoryArgs = {
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  autoSave?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CellNotebookContext = {
  __typename?: 'CellNotebookContext';
  cell: Cell;
  cellId: Scalars['String']['output'];
  createTime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  notebookContext: NotebookContext;
  notebookContextId: Scalars['String']['output'];
  organization: Organization;
  organizationId: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
};

export type CellOutput = {
  __typename?: 'CellOutput';
  archivedTime?: Maybe<Scalars['DateTime']['output']>;
  autoSave?: Maybe<Scalars['Boolean']['output']>;
  cell?: Maybe<Cell>;
  cellId: Scalars['String']['output'];
  cellSharings?: Maybe<Array<Maybe<CellSharing>>>;
  createTime: Scalars['DateTime']['output'];
  exitCode: Scalars['Int']['output'];
  fileName?: Maybe<Scalars['String']['output']>;
  hasMaskedData?: Maybe<Scalars['Boolean']['output']>;
  htmlUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  input?: Maybe<Scalars['String']['output']>;
  inputData: Scalars['Bytes']['output'];
  isOwner?: Maybe<Scalars['Boolean']['output']>;
  languageId?: Maybe<Scalars['String']['output']>;
  lifecycleIdentityId?: Maybe<Scalars['String']['output']>;
  maskedInput?: Maybe<Scalars['String']['output']>;
  maskedStderr?: Maybe<Scalars['Bytes']['output']>;
  maskedStdout?: Maybe<Scalars['Bytes']['output']>;
  metadata: Metadata;
  organization?: Maybe<Organization>;
  organizationId?: Maybe<Scalars['String']['output']>;
  owner?: Maybe<User>;
  pid: Scalars['Int']['output'];
  shareType: ShareType;
  stderr?: Maybe<Scalars['Bytes']['output']>;
  stderrData: Scalars['Bytes']['output'];
  stdout?: Maybe<Scalars['Bytes']['output']>;
  stdoutData: Scalars['Bytes']['output'];
  unmaskable: Scalars['Boolean']['output'];
  updateTime: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type CellOutputFilter = {
  ownedActive?: InputMaybe<Scalars['Boolean']['input']>;
  ownedArchived?: InputMaybe<Scalars['Boolean']['input']>;
  sharedWithMe?: InputMaybe<Scalars['Boolean']['input']>;
  sharedWithOrg?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CellOutputMessage = {
  __typename?: 'CellOutputMessage';
  cellOutput?: Maybe<CellOutput>;
  cellOutputId: Scalars['String']['output'];
  cellOutputMessages?: Maybe<Array<Maybe<CellOutputMessage>>>;
  createTime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  message: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  parentMessage?: Maybe<CellOutputMessage>;
  parentMessageId?: Maybe<Scalars['String']['output']>;
  updateTime: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

export type CellSharing = {
  __typename?: 'CellSharing';
  cellOutput?: Maybe<CellOutput>;
  cellOutputId: Scalars['String']['output'];
  group?: Maybe<Group>;
  groupId?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  organizationId?: Maybe<Scalars['String']['output']>;
  sharedBy?: Maybe<User>;
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

export type CreateAccessRequestInput = {
  referenceId: Scalars['String']['input'];
  referenceTable: Scalars['String']['input'];
};

export type CreateCellAttachmentInput = {
  cellId: Scalars['String']['input'];
  name: Scalars['String']['input'];
  organizationId?: InputMaybe<Scalars['String']['input']>;
  size: Scalars['Int']['input'];
  type: Scalars['String']['input'];
};

export type CreateCellExecutionInput = {
  archivedTime?: InputMaybe<Scalars['DateTime']['input']>;
  autoSave?: InputMaybe<Scalars['Boolean']['input']>;
  branch?: InputMaybe<Scalars['String']['input']>;
  commit?: InputMaybe<Scalars['String']['input']>;
  content?: InputMaybe<Scalars['Bytes']['input']>;
  createTime?: InputMaybe<Scalars['DateTime']['input']>;
  exitCode?: InputMaybe<Scalars['Int']['input']>;
  filePath?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  input: Scalars['Bytes']['input'];
  languageId?: InputMaybe<Scalars['String']['input']>;
  metadata: MetadataInput;
  notebook?: InputMaybe<CreateNotebookInput>;
  pid: Scalars['Int']['input'];
  repository?: InputMaybe<Scalars['String']['input']>;
  shareType?: InputMaybe<ShareType>;
  stderr: Scalars['Bytes']['input'];
  stdout: Scalars['Bytes']['input'];
  updateTime?: InputMaybe<Scalars['DateTime']['input']>;
};

export type CreateCellInput = {
  lifecycleIdentityId: Scalars['String']['input'];
  notebookId: Scalars['String']['input'];
  notebookSessionId?: InputMaybe<Scalars['String']['input']>;
};

export type CreateCellNotebookContextInput = {
  cellId: Scalars['String']['input'];
  notebookContextId: Scalars['String']['input'];
  organizationId: Scalars['String']['input'];
};

export type CreateCellOutputInput = {
  autoSave?: InputMaybe<Scalars['Boolean']['input']>;
  branch?: InputMaybe<Scalars['String']['input']>;
  commit?: InputMaybe<Scalars['String']['input']>;
  content: Scalars['Bytes']['input'];
  exitCode: Scalars['Int']['input'];
  extensionVersion?: InputMaybe<Scalars['String']['input']>;
  fileName?: InputMaybe<Scalars['String']['input']>;
  filePath?: InputMaybe<Scalars['String']['input']>;
  inputData: Scalars['Bytes']['input'];
  languageId?: InputMaybe<Scalars['String']['input']>;
  lifecycleIdentityId: Scalars['String']['input'];
  metadata: MetadataInput;
  notebookLifecycleIdentityId: Scalars['String']['input'];
  pid: Scalars['Int']['input'];
  repository?: InputMaybe<Scalars['String']['input']>;
  shareType?: InputMaybe<ShareType>;
  stderrData: Scalars['Bytes']['input'];
  stdoutData: Scalars['Bytes']['input'];
};

export type CreateCellOutputMessageInput = {
  cellOutputId: Scalars['String']['input'];
  message: Scalars['String']['input'];
  parentMessageId?: InputMaybe<Scalars['String']['input']>;
};

export type CreateCellSharingInput = {
  cellOutputId: Scalars['String']['input'];
  groupId?: InputMaybe<Scalars['String']['input']>;
  organizationId?: InputMaybe<Scalars['String']['input']>;
  sharedById: Scalars['String']['input'];
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type CreateEnvironmentInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  organizationId: Scalars['String']['input'];
};

export type CreateGithubInstallationInput = {
  accountAvatarUrl: Scalars['String']['input'];
  accountId: Scalars['Int']['input'];
  accountName: Scalars['String']['input'];
  appId: Scalars['Int']['input'];
  appSlug: Scalars['String']['input'];
  installationId: Scalars['Int']['input'];
  permissions: Scalars['JSON']['input'];
  repositorySelection: Scalars['String']['input'];
  suspendedAt?: InputMaybe<Scalars['DateTime']['input']>;
  suspendedBy?: InputMaybe<Scalars['String']['input']>;
  targetId: Scalars['Int']['input'];
  targetType: GithubTargetType;
  userId: Scalars['String']['input'];
};

export type CreateGroupInput = {
  name: Scalars['String']['input'];
  userIds: Array<InputMaybe<Scalars['String']['input']>>;
};

export type CreateInvitationInput = {
  metadata?: InputMaybe<InvitationMetadataInput>;
  referenceId: Scalars['String']['input'];
  referenceTable: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};

export type CreateLogInput = {
  data: Scalars['JSON']['input'];
  type: LogTypeEnum;
};

export type CreateLogTypeInput = {
  description: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type CreateNotebookContentInput = {
  content: Scalars['Bytes']['input'];
  hash: Scalars['String']['input'];
  notebookId: Scalars['String']['input'];
  organizationId: Scalars['String']['input'];
};

export type CreateNotebookContextInput = {
  branch?: InputMaybe<Scalars['String']['input']>;
  commit?: InputMaybe<Scalars['String']['input']>;
  filePath?: InputMaybe<Scalars['String']['input']>;
  notebookId: Scalars['String']['input'];
  organizationId: Scalars['String']['input'];
  repository?: InputMaybe<Scalars['String']['input']>;
};

export type CreateNotebookIdentityInput = {
  notebookId: Scalars['String']['input'];
  organizationId: Scalars['String']['input'];
  type: NotebookIdentityType;
  value: Scalars['String']['input'];
};

export type CreateNotebookInput = {
  fileName?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  runmeVersion?: InputMaybe<Scalars['String']['input']>;
};

export type CreateNotebookSessionInput = {
  environmentId?: InputMaybe<Scalars['String']['input']>;
  notebookId: Scalars['String']['input'];
  organizationId: Scalars['String']['input'];
};

export type CreateNotificationInput = {
  organizationId?: InputMaybe<Scalars['String']['input']>;
  referenceId: Scalars['String']['input'];
  referenceTable: Scalars['String']['input'];
  type: NotificationType;
  userId: Scalars['String']['input'];
};

export type CreateOrganizationInput = {
  name: Scalars['String']['input'];
};

export type CreateOrganizationUserInput = {
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  organizationId: Scalars['String']['input'];
  roleId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};

export type CreateRoleInput = {
  name: Scalars['String']['input'];
};

export type CreateSlackInstallationInput = {
  appId: Scalars['String']['input'];
  data: Scalars['JSON']['input'];
  defaultChannelId?: InputMaybe<Scalars['String']['input']>;
  defaultChannelName?: InputMaybe<Scalars['String']['input']>;
  scopes: Scalars['String']['input'];
  teamId: Scalars['String']['input'];
  teamName: Scalars['String']['input'];
  token: Scalars['Bytes']['input'];
  tokenType?: InputMaybe<SlackTokenType>;
};

export type CreateUserInput = {
  auth0Id?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  company?: InputMaybe<Scalars['String']['input']>;
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
  username?: InputMaybe<Scalars['String']['input']>;
};

export type CreateUserRoleInput = {
  organizationId: Scalars['String']['input'];
  roleId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};

export type CreateWorkflowInput = {
  fileName: Scalars['String']['input'];
  githubInstallationId?: InputMaybe<Scalars['String']['input']>;
  path: Scalars['String']['input'];
  repository: Scalars['String']['input'];
};

export type DeleteOrganizationUserInput = {
  userId: Scalars['String']['input'];
};

export type DocMetadata = {
  __typename?: 'DocMetadata';
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type Environment = {
  __typename?: 'Environment';
  createTime: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  organization: Organization;
  organizationId: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
};

export type GithubInstallation = {
  __typename?: 'GithubInstallation';
  accountAvatarUrl: Scalars['String']['output'];
  accountId: Scalars['Int']['output'];
  accountName: Scalars['String']['output'];
  appId: Scalars['Int']['output'];
  appSlug: Scalars['String']['output'];
  createTime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  installationId: Scalars['Int']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  permissions: GithubInstallationPermissions;
  repositorySelection: Scalars['String']['output'];
  suspendedAt?: Maybe<Scalars['DateTime']['output']>;
  suspendedBy?: Maybe<Scalars['String']['output']>;
  syncingState?: Maybe<SyncingStateEnum>;
  targetId: Scalars['Int']['output'];
  targetType: GithubTargetType;
  updateTime: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
  workflows?: Maybe<Array<Maybe<Workflow>>>;
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
  groupUsers?: Maybe<Array<Maybe<GroupUser>>>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
};

export type GroupUser = {
  __typename?: 'GroupUser';
  group?: Maybe<Group>;
  groupId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  user?: Maybe<User>;
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

export type Invitation = {
  __typename?: 'Invitation';
  createTime: Scalars['DateTime']['output'];
  createdBy?: Maybe<User>;
  createdById: Scalars['String']['output'];
  id: Scalars['String']['output'];
  metadata?: Maybe<InvitationMetadata>;
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  referenceId: Scalars['String']['output'];
  referenceTable: Scalars['String']['output'];
  status: InvitationStatus;
  updateTime: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type InvitationMetadata = {
  __typename?: 'InvitationMetadata';
  roleId?: Maybe<Scalars['String']['output']>;
};

export type InvitationMetadataInput = {
  roleId?: InputMaybe<Scalars['String']['input']>;
};

export enum InvitationStatus {
  Accepted = 'ACCEPTED',
  Declined = 'DECLINED',
  Pending = 'PENDING',
  Revoked = 'REVOKED'
}

export type InviteUserToOrganizationInput = {
  displayName?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  roleId: Scalars['String']['input'];
};

export type Log = {
  __typename?: 'Log';
  cellOutputAccess?: Maybe<LogCellOutput>;
  createTime: Scalars['DateTime']['output'];
  data: Scalars['JSON']['output'];
  id: Scalars['String']['output'];
  logType: LogType;
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type LogCellOutput = {
  __typename?: 'LogCellOutput';
  accessRequested?: Maybe<Scalars['Boolean']['output']>;
  hasAccess?: Maybe<Scalars['Boolean']['output']>;
  id?: Maybe<Scalars['String']['output']>;
};

export type LogType = {
  __typename?: 'LogType';
  description: Scalars['String']['output'];
  id: Scalars['String']['output'];
  logs?: Maybe<Array<Maybe<Log>>>;
  name: Scalars['String']['output'];
};

export enum LogTypeEnum {
  Crae = 'crae',
  Cre = 'cre',
  Crf = 'crf',
  Crs = 'crs',
  Crse = 'crse'
}

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
  acceptAccessRequest: AccessRequest;
  acceptInvitation: Invitation;
  activeOrganization: Organization;
  archiveCellExecution?: Maybe<CellExecution>;
  archiveCellOutput: CellOutput;
  createAccessRequest: AccessRequest;
  createCellExecution: CellExecution;
  createCellOutput: CellOutput;
  createCellOutputMessage: CellOutputMessage;
  createGroup: Group;
  createNotebookContext: NotebookContext;
  declineInvitation: Invitation;
  deleteCellOutput: CellOutput;
  deleteCellOutputMessage?: Maybe<CellOutputMessage>;
  deleteGroup: Group;
  deleteNotebookContext: NotebookContext;
  deleteOrganizationUser: OrganizationUser;
  deleteSlackInstallation: SlackInstallation;
  handleGithubInstallation: GithubInstallation;
  inviteUserToOrganization: User;
  readNotifications: Array<Maybe<Notification>>;
  rejectAccessRequest: AccessRequest;
  revokeInvitation: Invitation;
  shareCellOutputToSlack: CellOutput;
  syncGithubInstallation: GithubInstallation;
  unArchiveCellExecution?: Maybe<CellExecution>;
  unArchiveCellOutput: CellOutput;
  updateCellExecution: CellExecution;
  updateCellOutput: CellOutput;
  updateGroup: Group;
  updateNotebookContext: NotebookContext;
  updateOrganization: Organization;
  updateSlackInstallation: SlackInstallation;
  updateUserRole: User;
};


export type MutationAcceptAccessRequestArgs = {
  id: Scalars['String']['input'];
};


export type MutationAcceptInvitationArgs = {
  id: Scalars['String']['input'];
};


export type MutationActiveOrganizationArgs = {
  id: Scalars['String']['input'];
};


export type MutationArchiveCellExecutionArgs = {
  all?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['String']['input'];
};


export type MutationArchiveCellOutputArgs = {
  all?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['String']['input'];
};


export type MutationCreateAccessRequestArgs = {
  input: CreateAccessRequestInput;
};


export type MutationCreateCellExecutionArgs = {
  input: CreateCellExecutionInput;
};


export type MutationCreateCellOutputArgs = {
  input: CreateCellOutputInput;
};


export type MutationCreateCellOutputMessageArgs = {
  input: CreateCellOutputMessageInput;
};


export type MutationCreateGroupArgs = {
  input: CreateGroupInput;
};


export type MutationCreateNotebookContextArgs = {
  input: CreateNotebookContextInput;
};


export type MutationDeclineInvitationArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteCellOutputArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteCellOutputMessageArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteGroupArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteNotebookContextArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteOrganizationUserArgs = {
  input: DeleteOrganizationUserInput;
};


export type MutationDeleteSlackInstallationArgs = {
  id: Scalars['String']['input'];
};


export type MutationHandleGithubInstallationArgs = {
  input: HandleGithubInstallationInput;
};


export type MutationInviteUserToOrganizationArgs = {
  input: InviteUserToOrganizationInput;
};


export type MutationRejectAccessRequestArgs = {
  id: Scalars['String']['input'];
};


export type MutationRevokeInvitationArgs = {
  input: RevokeInvitationInput;
};


export type MutationShareCellOutputToSlackArgs = {
  input: ShareCellOutputToSlackInput;
};


export type MutationUnArchiveCellExecutionArgs = {
  all?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['String']['input'];
};


export type MutationUnArchiveCellOutputArgs = {
  all?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['String']['input'];
};


export type MutationUpdateCellExecutionArgs = {
  id: Scalars['String']['input'];
  input: UpdateCellExecutionInput;
  notifySlack?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationUpdateCellOutputArgs = {
  id: Scalars['String']['input'];
  input: UpdateCellOutputInput;
};


export type MutationUpdateGroupArgs = {
  id: Scalars['String']['input'];
  input: UpdateGroupInput;
};


export type MutationUpdateNotebookContextArgs = {
  id: Scalars['String']['input'];
  input: UpdateNotebookContextInput;
};


export type MutationUpdateOrganizationArgs = {
  id: Scalars['String']['input'];
  input: UpdateOrganizationInput;
};


export type MutationUpdateSlackInstallationArgs = {
  input: UpdateSlackInstallationInput;
};


export type MutationUpdateUserRoleArgs = {
  input: UpdateOrgUserRoleInput;
};

export type Notebook = {
  __typename?: 'Notebook';
  cells?: Maybe<Array<Maybe<Cell>>>;
  createTime?: Maybe<Scalars['DateTime']['output']>;
  currentNotebookContext: NotebookContext;
  id: Scalars['String']['output'];
  notebookIdentity: NotebookIdentity;
  updateTime?: Maybe<Scalars['DateTime']['output']>;
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type NotebookContent = {
  __typename?: 'NotebookContent';
  content: Scalars['Bytes']['output'];
  createTime: Scalars['DateTime']['output'];
  hash: Scalars['String']['output'];
  id: Scalars['String']['output'];
  notebook: Notebook;
  notebookId: Scalars['String']['output'];
  organization: Organization;
  organizationId: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
};

export type NotebookContext = {
  __typename?: 'NotebookContext';
  branch?: Maybe<Scalars['String']['output']>;
  cellNotebookContexts: Array<Maybe<CellNotebookContext>>;
  commit?: Maybe<Scalars['String']['output']>;
  createTime: Scalars['DateTime']['output'];
  filePath?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  notebookContent?: Maybe<NotebookContent>;
  notebookContentId?: Maybe<Scalars['String']['output']>;
  organization: Organization;
  organizationId: Scalars['String']['output'];
  repository?: Maybe<Scalars['String']['output']>;
  updateTime: Scalars['DateTime']['output'];
};

export type NotebookIdentity = {
  __typename?: 'NotebookIdentity';
  createTime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  notebook: Notebook;
  notebookId: Scalars['String']['output'];
  organization: Organization;
  organizationId: Scalars['String']['output'];
  type: NotebookIdentityType;
  updateTime: Scalars['DateTime']['output'];
  value: Scalars['String']['output'];
};

export enum NotebookIdentityType {
  Git = 'GIT',
  Lifecycle = 'LIFECYCLE'
}

export type NotebookSession = {
  __typename?: 'NotebookSession';
  cells: Array<Maybe<Cell>>;
  createTime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  notebook: Notebook;
  notebookId: Scalars['String']['output'];
  organization: Organization;
  organizationId: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
};

export type Notification = {
  __typename?: 'Notification';
  accessRequest?: Maybe<AccessRequest>;
  cellOutputMessage?: Maybe<CellOutputMessage>;
  createTime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  invitation?: Maybe<Invitation>;
  isRead: Scalars['Boolean']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  referenceId: Scalars['String']['output'];
  referenceTable: Scalars['String']['output'];
  type: NotificationType;
  updateTime: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export enum NotificationType {
  CellOutputAccessRequest = 'CELL_OUTPUT_ACCESS_REQUEST',
  CellOutputAccessRequestAccepted = 'CELL_OUTPUT_ACCESS_REQUEST_ACCEPTED',
  CellOutputAccessRequestRejected = 'CELL_OUTPUT_ACCESS_REQUEST_REJECTED',
  CellOutputMessageReply = 'CELL_OUTPUT_MESSAGE_REPLY',
  OrganizationUserInvitation = 'ORGANIZATION_USER_INVITATION',
  OrganizationUserInvitationAccepted = 'ORGANIZATION_USER_INVITATION_ACCEPTED',
  OrganizationUserInvitationDeclined = 'ORGANIZATION_USER_INVITATION_DECLINED'
}

export type OrgMetadata = {
  __typename?: 'OrgMetadata';
  hasSavedCells?: Maybe<Scalars['Boolean']['output']>;
  isIndexingEnabled?: Maybe<Scalars['Boolean']['output']>;
  isRenamed?: Maybe<Scalars['Boolean']['output']>;
};

export type OrgMetadataInput = {
  hasSavedCells?: InputMaybe<Scalars['Boolean']['input']>;
  isIndexingEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  isRenamed?: InputMaybe<Scalars['Boolean']['input']>;
};

export type Organization = {
  __typename?: 'Organization';
  createTime: Scalars['DateTime']['output'];
  domain?: Maybe<Scalars['String']['output']>;
  groups?: Maybe<Array<Maybe<Group>>>;
  id: Scalars['String']['output'];
  invitations?: Maybe<Array<Maybe<Invitation>>>;
  isDefault: Scalars['Boolean']['output'];
  metadata: OrgMetadata;
  name?: Maybe<Scalars['String']['output']>;
  organizationUsers?: Maybe<Array<Maybe<OrganizationUser>>>;
  updateTime: Scalars['DateTime']['output'];
};

export type OrganizationUser = {
  __typename?: 'OrganizationUser';
  id: Scalars['String']['output'];
  isActive?: Maybe<Scalars['Boolean']['output']>;
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  user?: Maybe<User>;
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

export type PaginatedLogs = {
  __typename?: 'PaginatedLogs';
  data: Array<Log>;
  meta: PaginationMeta;
};

export type PaginatedNotifications = {
  __typename?: 'PaginatedNotifications';
  data: Array<Notification>;
  meta: PaginationMeta;
};

export type PaginationMeta = {
  __typename?: 'PaginationMeta';
  totalPages: Scalars['Int']['output'];
  totalUnread?: Maybe<Scalars['Int']['output']>;
};

export enum PermissionEnum {
  ActiveOrganization = 'active_organization',
  CreateCellOutput = 'create_cell_output',
  CreateCellOutputAccessRequest = 'create_cell_output_access_request',
  CreateCellOutputMessage = 'create_cell_output_message',
  CreateGithubInstallation = 'create_github_installation',
  CreateGroup = 'create_group',
  CreateSlackInstallation = 'create_slack_installation',
  CreateUserInvitation = 'create_user_invitation',
  DeleteCellOutput = 'delete_cell_output',
  DeleteCellOutputMessage = 'delete_cell_output_message',
  DeleteGroup = 'delete_group',
  DeleteInvitation = 'delete_invitation',
  DeleteSlackInstallation = 'delete_slack_installation',
  OrgReadAnalytics = 'org_read_analytics',
  OrgReadGroup = 'org_read_group',
  OrgReadInvitation = 'org_read_invitation',
  OrgReadLog = 'org_read_log',
  OrgReadOrganizationUser = 'org_read_organization_user',
  OrgReadRole = 'org_read_role',
  UpdateAccessRequest = 'update_access_request',
  UpdateCellOutput = 'update_cell_output',
  UpdateGithubInstallation = 'update_github_installation',
  UpdateGroup = 'update_group',
  UpdateInvitation = 'update_invitation',
  UpdateNotification = 'update_notification',
  UpdateOrganization = 'update_organization',
  UpdateSlackInstallation = 'update_slack_installation',
  UserReadAccessRequest = 'user_read_access_request',
  UserReadAnalytics = 'user_read_analytics',
  UserReadAssistant = 'user_read_assistant',
  UserReadCell = 'user_read_cell',
  UserReadCellOutput = 'user_read_cell_output',
  UserReadCellOutputMessage = 'user_read_cell_output_message',
  UserReadChat = 'user_read_chat',
  UserReadGithubInstallation = 'user_read_github_installation',
  UserReadGroup = 'user_read_group',
  UserReadGroupUser = 'user_read_group_user',
  UserReadInvitation = 'user_read_invitation',
  UserReadNotebook = 'user_read_notebook',
  UserReadNotification = 'user_read_notification',
  UserReadOrganization = 'user_read_organization',
  UserReadOrganizationUser = 'user_read_organization_user',
  UserReadRole = 'user_read_role',
  UserReadSlackInstallation = 'user_read_slack_installation',
  UserReadUser = 'user_read_user',
  UserReadUserRole = 'user_read_user_role',
  UserReadWorkflow = 'user_read_workflow'
}

/** About the Redwood queries. */
export type Query = {
  __typename?: 'Query';
  assistant?: Maybe<Assistant>;
  cell?: Maybe<Cell>;
  cellOutput?: Maybe<CellOutput>;
  cellOutputMessages: Array<CellOutputMessage>;
  cellSuccessRateStats: AxisStat;
  cells: Array<Cell>;
  getSlackChannels?: Maybe<Array<Maybe<SlackChannel>>>;
  githubInstallation?: Maybe<GithubInstallation>;
  group?: Maybe<Group>;
  groups: Array<Group>;
  invitation: Invitation;
  log?: Maybe<Log>;
  logTypes: Array<LogType>;
  logs: PaginatedLogs;
  me?: Maybe<User>;
  notebook?: Maybe<Notebook>;
  notebookActivityStats: AxisStat;
  notebookContext?: Maybe<NotebookContext>;
  notebookContexts: Array<NotebookContext>;
  notebooks?: Maybe<Array<Maybe<Notebook>>>;
  notifications: PaginatedNotifications;
  organization?: Maybe<Organization>;
  organizations: Array<Organization>;
  /** Fetches the Redwood root schema. */
  redwood?: Maybe<Redwood>;
  roles: Array<Role>;
  slackInstallation?: Maybe<SlackInstallation>;
  totalCellOutputs: Scalars['Int']['output'];
  workflows: Array<Workflow>;
};


/** About the Redwood queries. */
export type QueryCellArgs = {
  filters?: InputMaybe<CellOutputFilter>;
  id: Scalars['String']['input'];
};


/** About the Redwood queries. */
export type QueryCellOutputArgs = {
  id: Scalars['String']['input'];
};


/** About the Redwood queries. */
export type QueryCellOutputMessagesArgs = {
  cellOutputId: Scalars['String']['input'];
};


/** About the Redwood queries. */
export type QueryCellSuccessRateStatsArgs = {
  filters: AnalyticFilterInput;
};


/** About the Redwood queries. */
export type QueryCellsArgs = {
  filters?: InputMaybe<CellOutputFilter>;
};


/** About the Redwood queries. */
export type QueryGroupArgs = {
  id: Scalars['String']['input'];
};


/** About the Redwood queries. */
export type QueryInvitationArgs = {
  id: Scalars['String']['input'];
};


/** About the Redwood queries. */
export type QueryLogArgs = {
  id: Scalars['String']['input'];
};


/** About the Redwood queries. */
export type QueryLogsArgs = {
  filters?: InputMaybe<Scalars['JSON']['input']>;
  page: Scalars['Int']['input'];
  take?: InputMaybe<Scalars['Int']['input']>;
};


/** About the Redwood queries. */
export type QueryNotebookArgs = {
  id: Scalars['String']['input'];
};


/** About the Redwood queries. */
export type QueryNotebookActivityStatsArgs = {
  filters: AnalyticFilterInput;
};


/** About the Redwood queries. */
export type QueryNotebookContextArgs = {
  id: Scalars['String']['input'];
};


/** About the Redwood queries. */
export type QueryNotificationsArgs = {
  filters?: InputMaybe<Scalars['JSON']['input']>;
  page: Scalars['Int']['input'];
  take?: InputMaybe<Scalars['Int']['input']>;
};


/** About the Redwood queries. */
export type QueryOrganizationArgs = {
  id: Scalars['String']['input'];
};


/** About the Redwood queries. */
export type QueryTotalCellOutputsArgs = {
  filters?: InputMaybe<CellOutputFilter>;
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

export type RevokeInvitationInput = {
  referenceTable: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};

export type Role = {
  __typename?: 'Role';
  createTime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
};

export enum RoleEnum {
  Admin = 'admin',
  Guest = 'guest',
  User = 'user'
}

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

export type ShareCellOutputToSlackInput = {
  cellOutputId?: InputMaybe<Scalars['String']['input']>;
  channelId?: InputMaybe<Scalars['String']['input']>;
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
  organization?: Maybe<Organization>;
  scopes: Scalars['String']['output'];
  teamId: Scalars['String']['output'];
  teamName: Scalars['String']['output'];
  token: Scalars['Bytes']['output'];
  tokenType?: Maybe<SlackTokenType>;
  updateTime: Scalars['DateTime']['output'];
};

export enum SlackTokenType {
  SlackBot = 'SLACK_BOT',
  SlackUser = 'SLACK_USER'
}

export type Subscription = {
  __typename?: 'Subscription';
  chat?: Maybe<ChatMessage>;
};

export enum SyncingStateEnum {
  Error = 'ERROR',
  Synced = 'SYNCED',
  Syncing = 'SYNCING'
}

export type UpdateAccessRequestInput = {
  createTime?: InputMaybe<Scalars['DateTime']['input']>;
  organizationId?: InputMaybe<Scalars['String']['input']>;
  referenceId?: InputMaybe<Scalars['String']['input']>;
  referenceTable?: InputMaybe<Scalars['String']['input']>;
  requestedById?: InputMaybe<Scalars['String']['input']>;
  updateTime?: InputMaybe<Scalars['DateTime']['input']>;
};

export type UpdateCellAttachmentInput = {
  cellId?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  organizationId?: InputMaybe<Scalars['String']['input']>;
  size?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateCellExecutionInput = {
  isPrivate?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateCellInput = {
  lifecycleIdentityId?: InputMaybe<Scalars['String']['input']>;
  notebookId?: InputMaybe<Scalars['String']['input']>;
  notebookSessionId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateCellNotebookContextInput = {
  cellId?: InputMaybe<Scalars['String']['input']>;
  createTime?: InputMaybe<Scalars['DateTime']['input']>;
  notebookContextId?: InputMaybe<Scalars['String']['input']>;
  organizationId?: InputMaybe<Scalars['String']['input']>;
  updateTime?: InputMaybe<Scalars['DateTime']['input']>;
};

export type UpdateCellOutputInput = {
  groupIds?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  notify?: InputMaybe<Scalars['Boolean']['input']>;
  shareType: ShareType;
  unmaskable?: InputMaybe<Scalars['Boolean']['input']>;
  userIds?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type UpdateCellOutputMessageInput = {
  cellOutputId?: InputMaybe<Scalars['String']['input']>;
  message?: InputMaybe<Scalars['String']['input']>;
  parentMessageId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateCellSharingInput = {
  cellOutputId?: InputMaybe<Scalars['String']['input']>;
  groupId?: InputMaybe<Scalars['String']['input']>;
  organizationId?: InputMaybe<Scalars['String']['input']>;
  sharedById?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateEnvironmentInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  organizationId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateGithubInstallationInput = {
  accountAvatarUrl?: InputMaybe<Scalars['String']['input']>;
  accountId?: InputMaybe<Scalars['Int']['input']>;
  accountName?: InputMaybe<Scalars['String']['input']>;
  appId?: InputMaybe<Scalars['Int']['input']>;
  appSlug?: InputMaybe<Scalars['String']['input']>;
  installationId?: InputMaybe<Scalars['Int']['input']>;
  permissions?: InputMaybe<Scalars['JSON']['input']>;
  repositorySelection?: InputMaybe<Scalars['String']['input']>;
  suspendedAt?: InputMaybe<Scalars['DateTime']['input']>;
  suspendedBy?: InputMaybe<Scalars['String']['input']>;
  targetId?: InputMaybe<Scalars['Int']['input']>;
  targetType?: InputMaybe<GithubTargetType>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateGroupInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  userIds?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type UpdateGroupUserInput = {
  groupId?: InputMaybe<Scalars['String']['input']>;
  organizationId?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateInvitationInput = {
  createTime?: InputMaybe<Scalars['DateTime']['input']>;
  organizationId?: InputMaybe<Scalars['String']['input']>;
  referenceId?: InputMaybe<Scalars['String']['input']>;
  referenceTable?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<InvitationStatus>;
  updateTime?: InputMaybe<Scalars['DateTime']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateLogInput = {
  data?: InputMaybe<Scalars['JSON']['input']>;
  type?: InputMaybe<LogTypeEnum>;
};

export type UpdateLogTypeInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateNotebookContentInput = {
  content: Scalars['Bytes']['input'];
  createTime?: InputMaybe<Scalars['DateTime']['input']>;
  hash?: InputMaybe<Scalars['String']['input']>;
  notebookId?: InputMaybe<Scalars['String']['input']>;
  organizationId?: InputMaybe<Scalars['String']['input']>;
  updateTime?: InputMaybe<Scalars['DateTime']['input']>;
};

export type UpdateNotebookContextInput = {
  branch?: InputMaybe<Scalars['String']['input']>;
  commit?: InputMaybe<Scalars['String']['input']>;
  createTime?: InputMaybe<Scalars['DateTime']['input']>;
  filePath?: InputMaybe<Scalars['String']['input']>;
  organizationId?: InputMaybe<Scalars['String']['input']>;
  repository?: InputMaybe<Scalars['String']['input']>;
  updateTime?: InputMaybe<Scalars['DateTime']['input']>;
};

export type UpdateNotebookIdentityInput = {
  createTime?: InputMaybe<Scalars['DateTime']['input']>;
  notebookId?: InputMaybe<Scalars['String']['input']>;
  organizationId?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<NotebookIdentityType>;
  updateTime?: InputMaybe<Scalars['DateTime']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateNotebookInput = {
  id: Scalars['String']['input'];
  lifecycleIdentityId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateNotebookSessionInput = {
  environmentId?: InputMaybe<Scalars['String']['input']>;
  notebookId?: InputMaybe<Scalars['String']['input']>;
  organizationId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateNotificationInput = {
  createTime?: InputMaybe<Scalars['DateTime']['input']>;
  organizationId?: InputMaybe<Scalars['String']['input']>;
  referenceId?: InputMaybe<Scalars['String']['input']>;
  referenceTable?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<NotificationType>;
  updateTime?: InputMaybe<Scalars['DateTime']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOrgUserRoleInput = {
  id: Scalars['String']['input'];
  roleId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOrganizationInput = {
  metadata?: InputMaybe<OrgMetadataInput>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOrganizationUserInput = {
  organizationId?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateRoleInput = {
  createTime?: InputMaybe<Scalars['DateTime']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  updateTime?: InputMaybe<Scalars['DateTime']['input']>;
};

export type UpdateSlackInstallationInput = {
  defaultChannelId?: InputMaybe<Scalars['String']['input']>;
  defaultChannelName?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUserInput = {
  auth0Id?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  company?: InputMaybe<Scalars['String']['input']>;
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
  username?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUserRoleInput = {
  createTime?: InputMaybe<Scalars['DateTime']['input']>;
  organizationId?: InputMaybe<Scalars['String']['input']>;
  roleId?: InputMaybe<Scalars['String']['input']>;
  updateTime?: InputMaybe<Scalars['DateTime']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateWorkflowInput = {
  fileName?: InputMaybe<Scalars['String']['input']>;
  githubInstallationId?: InputMaybe<Scalars['String']['input']>;
  path?: InputMaybe<Scalars['String']['input']>;
  repository?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  Notebook?: Maybe<Array<Maybe<Notebook>>>;
  SlackInstallations?: Maybe<Array<Maybe<SlackInstallation>>>;
  auth0Id?: Maybe<Scalars['String']['output']>;
  bio?: Maybe<Scalars['String']['output']>;
  cells?: Maybe<Array<Maybe<Cell>>>;
  company?: Maybe<Scalars['String']['output']>;
  createTime?: Maybe<Scalars['DateTime']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  emailVerified?: Maybe<Scalars['Boolean']['output']>;
  firebaseRefreshTime?: Maybe<Scalars['DateTime']['output']>;
  githubId?: Maybe<Scalars['String']['output']>;
  githubRefreshTime?: Maybe<Scalars['DateTime']['output']>;
  githubUsername?: Maybe<Scalars['String']['output']>;
  googleId?: Maybe<Scalars['String']['output']>;
  googleRefreshTime?: Maybe<Scalars['DateTime']['output']>;
  groupUsers?: Maybe<Array<Maybe<GroupUser>>>;
  id: Scalars['String']['output'];
  linkedin?: Maybe<Scalars['String']['output']>;
  microsoftId?: Maybe<Scalars['String']['output']>;
  microsoftRefreshTime?: Maybe<Scalars['DateTime']['output']>;
  organizationUsers?: Maybe<Array<Maybe<OrganizationUser>>>;
  photoUrl?: Maybe<Scalars['String']['output']>;
  signupOrigin?: Maybe<SignupOrigin>;
  siteAdmin?: Maybe<Scalars['Boolean']['output']>;
  siteUrl?: Maybe<Scalars['String']['output']>;
  twitter?: Maybe<Scalars['String']['output']>;
  updateTime?: Maybe<Scalars['DateTime']['output']>;
  userRoles?: Maybe<Array<Maybe<UserRole>>>;
  username?: Maybe<Scalars['String']['output']>;
};

export type UserRole = {
  __typename?: 'UserRole';
  createTime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  role?: Maybe<Role>;
  roleId: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type Workflow = {
  __typename?: 'Workflow';
  fileName: Scalars['String']['output'];
  githubInstallation?: Maybe<GithubInstallation>;
  githubInstallationId?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  path: Scalars['String']['output'];
  repository: Scalars['String']['output'];
};

export type _CreateNotebookInput = {
  lifecycleIdentityId: Scalars['String']['input'];
};

export type ArchiveCellExecutionMutationVariables = Exact<{
  archiveCellExecutionId: Scalars['String']['input'];
}>;


export type ArchiveCellExecutionMutation = { __typename?: 'Mutation', archiveCellExecution?: { __typename?: 'CellExecution', id: string } | null };

export type CreateCellExecutionMutationVariables = Exact<{
  input: CreateCellExecutionInput;
}>;


export type CreateCellExecutionMutation = { __typename?: 'Mutation', createCellExecution: { __typename?: 'CellExecution', id: string, htmlUrl?: string | null, exitCode: number, isSlackReady: boolean } };

export type UpdateCellExecutionMutationVariables = Exact<{
  id: Scalars['String']['input'];
  input: UpdateCellExecutionInput;
}>;


export type UpdateCellExecutionMutation = { __typename?: 'Mutation', updateCellExecution: { __typename?: 'CellExecution', id: string, htmlUrl?: string | null, exitCode: number, isSlackReady: boolean } };


export const ArchiveCellExecutionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ArchiveCellExecution"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"archiveCellExecutionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"archiveCellExecution"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"archiveCellExecutionId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ArchiveCellExecutionMutation, ArchiveCellExecutionMutationVariables>;
export const CreateCellExecutionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCellExecution"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateCellExecutionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCellExecution"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"htmlUrl"}},{"kind":"Field","name":{"kind":"Name","value":"exitCode"}},{"kind":"Field","name":{"kind":"Name","value":"isSlackReady"}}]}}]}}]} as unknown as DocumentNode<CreateCellExecutionMutation, CreateCellExecutionMutationVariables>;
export const UpdateCellExecutionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateCellExecution"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateCellExecutionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateCellExecution"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"htmlUrl"}},{"kind":"Field","name":{"kind":"Name","value":"exitCode"}},{"kind":"Field","name":{"kind":"Name","value":"isSlackReady"}}]}}]}}]} as unknown as DocumentNode<UpdateCellExecutionMutation, UpdateCellExecutionMutationVariables>;