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

export type Access = {
  __typename?: 'Access';
  createTime: Scalars['DateTime']['output'];
  group?: Maybe<Group>;
  groupId?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  organization: Organization;
  organizationId: Scalars['String']['output'];
  sharedBy: User;
  sharedById: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
};

export type AccessCellOutput = {
  __typename?: 'AccessCellOutput';
  access?: Maybe<Access>;
  accessId: Scalars['String']['output'];
  cellOutput?: Maybe<CellOutput>;
  cellOutputId: Scalars['String']['output'];
  createTime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
};

export type AccessEnvironment = {
  __typename?: 'AccessEnvironment';
  access?: Maybe<Access>;
  accessId: Scalars['String']['output'];
  createTime: Scalars['DateTime']['output'];
  environment?: Maybe<Environment>;
  environmentId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
};

export type AccessEscalation = {
  __typename?: 'AccessEscalation';
  access: Access;
  accessId: Scalars['String']['output'];
  createTime: Scalars['DateTime']['output'];
  escalation: Escalation;
  escalationId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  organization: Organization;
  organizationId: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
};

export type AccessNotebookMetadataOutput = {
  __typename?: 'AccessNotebookMetadataOutput';
  access?: Maybe<Access>;
  accessId: Scalars['String']['output'];
  createTime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
};

export type AccessNotebookSession = {
  __typename?: 'AccessNotebookSession';
  access?: Maybe<Access>;
  accessId: Scalars['String']['output'];
  createTime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
};

export type AccessRequest = {
  __typename?: 'AccessRequest';
  cellOutput?: Maybe<CellOutput>;
  createTime: Scalars['DateTime']['output'];
  escalation?: Maybe<Escalation>;
  id: Scalars['String']['output'];
  metadata?: Maybe<AccessRequestMetadata>;
  notebookMetadataOutput?: Maybe<NotebookMetadataOutput>;
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  referenceId: Scalars['String']['output'];
  referenceTable: Scalars['String']['output'];
  requestedBy?: Maybe<User>;
  requestedById?: Maybe<Scalars['String']['output']>;
  status: AccessRequestStatus;
  updateTime: Scalars['DateTime']['output'];
};

export type AccessRequestMetadata = {
  __typename?: 'AccessRequestMetadata';
  escalationId?: Maybe<Scalars['String']['output']>;
};

export type AccessRequestMetadataInput = {
  escalationId: Scalars['String']['input'];
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
  date?: Maybe<Scalars['DateTime']['output']>;
  xAxis?: Maybe<Scalars['IntOrString']['output']>;
  yAxis?: Maybe<Scalars['Int']['output']>;
};

export type AxisStat = {
  __typename?: 'AxisStat';
  data: Array<Maybe<AxisData>>;
  legends?: Maybe<Array<Maybe<Scalars['JSON']['output']>>>;
};

export type Bookmark = {
  __typename?: 'Bookmark';
  cellOutput?: Maybe<CellOutput>;
  conversation?: Maybe<Conversation>;
  createTime: Scalars['DateTime']['output'];
  escalation?: Maybe<Escalation>;
  id: Scalars['String']['output'];
  notebook?: Maybe<NotebookMetadataOutput>;
  organization?: Maybe<Organization>;
  organizationId?: Maybe<Scalars['String']['output']>;
  updateTime: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['String']['output'];
  workflow?: Maybe<Workflow>;
};

export type BookmarkEscalation = {
  __typename?: 'BookmarkEscalation';
  bookmark: Bookmark;
  bookmarkId: Scalars['String']['output'];
  createTime: Scalars['DateTime']['output'];
  escalation: Escalation;
  escalationId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  organization: Organization;
  organizationId: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
};

export type BooleanInput = {
  value?: InputMaybe<Scalars['Boolean']['input']>;
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
  cell?: Maybe<Cell>;
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

export type CellInput = {
  __typename?: 'CellInput';
  cellNotebookMetadataList?: Maybe<Array<Maybe<CellNotebookMetadata>>>;
  createTime: Scalars['DateTime']['output'];
  data: Scalars['Bytes']['output'];
  hash: Scalars['String']['output'];
  id: Scalars['String']['output'];
  input?: Maybe<Scalars['String']['output']>;
  maskedInput?: Maybe<Scalars['String']['output']>;
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
};

export type CellNotebookMetadata = {
  __typename?: 'CellNotebookMetadata';
  category?: Maybe<Scalars['String']['output']>;
  cell?: Maybe<Cell>;
  cellId: Scalars['String']['output'];
  cellInput?: Maybe<CellInput>;
  cellInputId: Scalars['String']['output'];
  createTime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  notebookMetadata?: Maybe<NotebookMetadata>;
  notebookMetadataId: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
};

export type CellOutput = {
  __typename?: 'CellOutput';
  accessCellOutputs?: Maybe<Array<Maybe<AccessCellOutput>>>;
  archivedTime?: Maybe<Scalars['DateTime']['output']>;
  autoSave?: Maybe<Scalars['Boolean']['output']>;
  bookmark?: Maybe<Bookmark>;
  cell?: Maybe<Cell>;
  cellId: Scalars['String']['output'];
  cellNotebookMetadata?: Maybe<CellNotebookMetadata>;
  cellNotebookMetadataId?: Maybe<Scalars['String']['output']>;
  conversation?: Maybe<Conversation>;
  createTime: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  endTime?: Maybe<Scalars['DateTime']['output']>;
  escalation?: Maybe<Escalation>;
  exitCode: Scalars['Int']['output'];
  exitType?: Maybe<Scalars['String']['output']>;
  hasMaskedData?: Maybe<Scalars['Boolean']['output']>;
  htmlUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  input?: Maybe<Scalars['String']['output']>;
  inputData?: Maybe<Scalars['Bytes']['output']>;
  isOwner?: Maybe<Scalars['Boolean']['output']>;
  isSlackReady?: Maybe<Scalars['Boolean']['output']>;
  languageId?: Maybe<Scalars['String']['output']>;
  lifecycleIdentityId?: Maybe<Scalars['String']['output']>;
  maskedInput?: Maybe<Scalars['String']['output']>;
  maskedStderr?: Maybe<Scalars['Bytes']['output']>;
  maskedStdout?: Maybe<Scalars['Bytes']['output']>;
  mimeType?: Maybe<Scalars['String']['output']>;
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  owner?: Maybe<User>;
  pid?: Maybe<Scalars['Int']['output']>;
  resourceAccess?: Maybe<ResourceAccess>;
  shareType?: Maybe<ShareType>;
  startTime?: Maybe<Scalars['DateTime']['output']>;
  stderr?: Maybe<Scalars['Bytes']['output']>;
  stderrData?: Maybe<Scalars['Bytes']['output']>;
  stdout?: Maybe<Scalars['Bytes']['output']>;
  stdoutData?: Maybe<Scalars['Bytes']['output']>;
  tags?: Maybe<Array<Maybe<Tag>>>;
  unmaskable: Scalars['Boolean']['output'];
  updateTime: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};


export type CellOutputCellArgs = {
  filters?: InputMaybe<CellOutputFilter>;
};

export type CellOutputFilter = {
  ownedActive?: InputMaybe<Scalars['Boolean']['input']>;
  ownedArchived?: InputMaybe<Scalars['Boolean']['input']>;
  sharedOnSlack?: InputMaybe<Scalars['Boolean']['input']>;
  sharedWithMe?: InputMaybe<Scalars['Boolean']['input']>;
  sharedWithOrg?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CellOutputSlackShare = {
  __typename?: 'CellOutputSlackShare';
  cellOutput?: Maybe<CellOutput>;
  cellOutputId: Scalars['String']['output'];
  createTime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  organizationId?: Maybe<Scalars['String']['output']>;
  updateTime: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type CellRun = {
  __typename?: 'CellRun';
  cell: Cell;
  cellId: Scalars['String']['output'];
  createTime: Scalars['DateTime']['output'];
  elapsedTime: Scalars['Int']['output'];
  endTime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  isSuccess: Scalars['Boolean']['output'];
  organization: Organization;
  organizationId: Scalars['String']['output'];
  startTime: Scalars['DateTime']['output'];
  updateTime: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['String']['output'];
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
  internal?: InputMaybe<Scalars['Boolean']['input']>;
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

export type Conversation = {
  __typename?: 'Conversation';
  bookmark?: Maybe<Bookmark>;
  cellOutput?: Maybe<CellOutput>;
  createTime: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  escalation?: Maybe<Escalation>;
  id: Scalars['String']['output'];
  isResourceOwner?: Maybe<Scalars['Boolean']['output']>;
  messages?: Maybe<Array<Maybe<Message>>>;
  name?: Maybe<Scalars['String']['output']>;
  notebookMetadataOutput?: Maybe<NotebookMetadataOutput>;
  organization?: Maybe<Organization>;
  organizationId?: Maybe<Scalars['String']['output']>;
  referenceId: Scalars['String']['output'];
  referenceTable: Scalars['String']['output'];
  resourceAccess?: Maybe<ResourceAccess>;
  tags?: Maybe<Array<Maybe<Tag>>>;
  totalMessages?: Maybe<Scalars['Int']['output']>;
  totalUsers?: Maybe<Scalars['Int']['output']>;
  updateTime: Scalars['DateTime']['output'];
  users?: Maybe<Array<Maybe<User>>>;
};

export type CreateAccessRequestInput = {
  metadata?: InputMaybe<AccessRequestMetadataInput>;
  referenceId: Scalars['String']['input'];
  referenceTable: Scalars['String']['input'];
};

export type CreateBookmarkInput = {
  resourceId: Scalars['String']['input'];
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
  createTime?: InputMaybe<Scalars['DateTime']['input']>;
  device?: InputMaybe<_DeviceInput>;
  exitCode?: InputMaybe<Scalars['Int']['input']>;
  fileContent?: InputMaybe<Scalars['Bytes']['input']>;
  filePath?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  input: Scalars['Bytes']['input'];
  languageId?: InputMaybe<Scalars['String']['input']>;
  maskedSessionOutput?: InputMaybe<Scalars['Bytes']['input']>;
  metadata: MetadataInput;
  notebook?: InputMaybe<CreateNotebookInput>;
  pid: Scalars['Int']['input'];
  plainSessionOutput?: InputMaybe<Scalars['Bytes']['input']>;
  repository?: InputMaybe<Scalars['String']['input']>;
  sessionId?: InputMaybe<Scalars['String']['input']>;
  shareType?: InputMaybe<ShareType>;
  stderr: Scalars['Bytes']['input'];
  stdout: Scalars['Bytes']['input'];
  updateTime?: InputMaybe<Scalars['DateTime']['input']>;
};

export type CreateCellOutputGistInput = {
  cellOutputId: Scalars['String']['input'];
};

export type CreateCellOutputInput = {
  autoSave?: InputMaybe<Scalars['Boolean']['input']>;
  branch?: InputMaybe<Scalars['String']['input']>;
  commit?: InputMaybe<Scalars['String']['input']>;
  device?: InputMaybe<_DeviceInput>;
  exitCode: Scalars['Int']['input'];
  extensionVersion?: InputMaybe<Scalars['String']['input']>;
  fileContent: Scalars['Bytes']['input'];
  fileName?: InputMaybe<Scalars['String']['input']>;
  filePath?: InputMaybe<Scalars['String']['input']>;
  inputData: Scalars['Bytes']['input'];
  languageId?: InputMaybe<Scalars['String']['input']>;
  lifecycleIdentityId: Scalars['String']['input'];
  maskedSessionOutput?: InputMaybe<Scalars['Bytes']['input']>;
  metadata: MetadataInput;
  notebookLifecycleIdentityId: Scalars['String']['input'];
  pid: Scalars['Int']['input'];
  plainSessionOutput?: InputMaybe<Scalars['Bytes']['input']>;
  repository?: InputMaybe<Scalars['String']['input']>;
  sessionId?: InputMaybe<Scalars['String']['input']>;
  shareType?: InputMaybe<ShareType>;
  stderrData: Scalars['Bytes']['input'];
  stdoutData: Scalars['Bytes']['input'];
};

export type CreateCellOutputSlackShareInput = {
  cellOutputId: Scalars['String']['input'];
};

export type CreateCellRunInput = {
  cellId: Scalars['String']['input'];
  createTime: Scalars['DateTime']['input'];
  elapsedTime: Scalars['Int']['input'];
  endTime: Scalars['DateTime']['input'];
  isSuccess: Scalars['Boolean']['input'];
  organizationId: Scalars['String']['input'];
  startTime: Scalars['DateTime']['input'];
  updateTime: Scalars['DateTime']['input'];
  userId: Scalars['String']['input'];
};

export type CreateEnvironmentInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreateEscalationInput = {
  assignee?: InputMaybe<Scalars['String']['input']>;
  cellOutputId: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  status: EscalationStatus;
  watchers?: InputMaybe<Array<Scalars['String']['input']>>;
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

export type CreateMessageInput = {
  message: Scalars['String']['input'];
  parentMessageId?: InputMaybe<Scalars['String']['input']>;
  referenceId: Scalars['String']['input'];
  referenceTable: Scalars['String']['input'];
};

export type CreateNotebookInput = {
  fileName?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  runmeVersion?: InputMaybe<Scalars['String']['input']>;
};

export type CreateNotebookMetadataOutputGistInput = {
  notebookMetadataOutputId: Scalars['String']['input'];
};

export type CreateNotebookMetadataOutputSlackShareInput = {
  notebookMetadataOutputId?: InputMaybe<Scalars['String']['input']>;
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

export type CreateTagInput = {
  name: Scalars['String']['input'];
};

export type CreateUserInput = {
  displayName?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
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

export type DataRageFilter = {
  from: Scalars['Date']['input'];
  to: Scalars['Date']['input'];
};

export type DeleteOrganizationUserInput = {
  userId: Scalars['String']['input'];
};

export type Device = {
  __typename?: 'Device';
  arch?: Maybe<Scalars['String']['output']>;
  brand?: Maybe<Scalars['String']['output']>;
  distro?: Maybe<Scalars['String']['output']>;
  hostname?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  macAddress?: Maybe<Scalars['String']['output']>;
  metadata?: Maybe<Scalars['JSON']['output']>;
  notebookMetadataList?: Maybe<Array<Maybe<NotebookMetadata>>>;
  organization?: Maybe<Organization>;
  organizationId?: Maybe<Scalars['String']['output']>;
  platform?: Maybe<Scalars['String']['output']>;
  release?: Maybe<Scalars['String']['output']>;
  shell?: Maybe<Scalars['String']['output']>;
  vendor?: Maybe<Scalars['String']['output']>;
  vsAppHost?: Maybe<Scalars['String']['output']>;
  vsAppName?: Maybe<Scalars['String']['output']>;
  vsMachineId?: Maybe<Scalars['String']['output']>;
  vsSessionId?: Maybe<Scalars['String']['output']>;
};

export type DocMetadata = {
  __typename?: 'DocMetadata';
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type Environment = {
  __typename?: 'Environment';
  accessEnvironments?: Maybe<Array<Maybe<AccessEnvironment>>>;
  createTime: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
};

export type Escalation = {
  __typename?: 'Escalation';
  assignee?: Maybe<User>;
  bookmark?: Maybe<Bookmark>;
  cellName?: Maybe<Scalars['String']['output']>;
  cellOutput?: Maybe<CellOutput>;
  cellOutputId: Scalars['String']['output'];
  conversation?: Maybe<Conversation>;
  createTime: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  escalationOrganizations?: Maybe<Array<Maybe<EscalationOrganization>>>;
  escalationUrl?: Maybe<Scalars['String']['output']>;
  escalationUsers?: Maybe<Array<Maybe<EscalationUser>>>;
  filePath?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  isOwner?: Maybe<Scalars['Boolean']['output']>;
  isWatcher?: Maybe<Scalars['Boolean']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  notebookSessionId?: Maybe<Scalars['String']['output']>;
  organization?: Maybe<Organization>;
  organizationId?: Maybe<Scalars['String']['output']>;
  resourceAccess?: Maybe<ResourceAccess>;
  shareType: ShareType;
  status?: Maybe<EscalationStatus>;
  summary?: Maybe<Scalars['String']['output']>;
  updateTime: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
};

export type EscalationFilter = {
  blocked?: InputMaybe<Scalars['Boolean']['input']>;
  closed?: InputMaybe<Scalars['Boolean']['input']>;
  inProgress?: InputMaybe<Scalars['Boolean']['input']>;
  onlyWithAccess?: InputMaybe<Scalars['Boolean']['input']>;
  open?: InputMaybe<Scalars['Boolean']['input']>;
};

export type EscalationOrganization = {
  __typename?: 'EscalationOrganization';
  createTime: Scalars['DateTime']['output'];
  escalation: Escalation;
  escalationId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  organizationId: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
};

export enum EscalationStatus {
  Blocked = 'BLOCKED',
  Closed = 'CLOSED',
  InProgress = 'IN_PROGRESS',
  Open = 'OPEN'
}

export type EscalationUser = {
  __typename?: 'EscalationUser';
  createTime: Scalars['DateTime']['output'];
  escalation: Escalation;
  escalationId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  isNotificationEnabled?: Maybe<Scalars['Boolean']['output']>;
  organization: Organization;
  organizationId: Scalars['String']['output'];
  type: EscalationUserType;
  updateTime: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

export enum EscalationUserType {
  Assignee = 'ASSIGNEE',
  Owner = 'OWNER',
  Watcher = 'WATCHER'
}

export type Gist = {
  __typename?: 'Gist';
  id: Scalars['String']['output'];
  url: Scalars['String']['output'];
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

export type Int64Input = {
  value?: InputMaybe<Scalars['String']['input']>;
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

export type KnowledgeBaseResult = {
  __typename?: 'KnowledgeBaseResult';
  cellOutput?: Maybe<CellOutput>;
  conversation?: Maybe<Conversation>;
  entityType: Scalars['String']['output'];
  escalation?: Maybe<Escalation>;
  notebook?: Maybe<NotebookMetadataOutput>;
  workflow?: Maybe<Workflow>;
};

export type Log = {
  __typename?: 'Log';
  createTime: Scalars['DateTime']['output'];
  data: Scalars['JSON']['output'];
  id: Scalars['String']['output'];
  logType: LogType;
  resourceAccess?: Maybe<ResourceAccess>;
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
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

export type Message = {
  __typename?: 'Message';
  conversation?: Maybe<Conversation>;
  conversationId: Scalars['String']['output'];
  createTime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  isRead: Scalars['Boolean']['output'];
  message: Scalars['String']['output'];
  messages?: Maybe<Array<Maybe<Message>>>;
  parentMessage?: Maybe<Message>;
  parentMessageId?: Maybe<Scalars['String']['output']>;
  updateTime: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
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
  acceptAccessRequest: AccessRequest;
  acceptInvitation: Invitation;
  activeOrganization: Organization;
  archiveCellExecution?: Maybe<CellExecution>;
  archiveCellOutput: CellOutput;
  createAccessRequest: AccessRequest;
  createCellExecution: CellExecution;
  createCellOutput: CellOutput;
  createCellOutputBookmark: Bookmark;
  createCellOutputGist: Gist;
  createCellRun: CellRun;
  createConversationBookmark: Bookmark;
  createEnvironment: Environment;
  createEscalation: Escalation;
  createEscalationBookmark: Bookmark;
  createExtensionCellOutput: CellOutput;
  createGroup: Group;
  createMarkdownBookmark: Bookmark;
  createMessage: Message;
  createNotebookMetadataOutputGist: Gist;
  createNotebookOutputBookmark: Bookmark;
  declineInvitation: Invitation;
  deleteBookmark: Bookmark;
  deleteCellOutput: CellOutput;
  deleteCellRun: CellRun;
  deleteEnvironment: Environment;
  deleteGroup: Group;
  deleteMessage: Message;
  deleteOrganizationUser: OrganizationUser;
  deleteSlackInstallation: SlackInstallation;
  handleGithubInstallation: GithubInstallation;
  inviteUserToOrganization: User;
  rateMarkdown: Rating;
  readNotifications: Array<Maybe<Notification>>;
  rejectAccessRequest: AccessRequest;
  revokeInvitation: Invitation;
  shareCellOutputToSlack: CellOutput;
  shareNotebookMetadataOutputToSlack: Notebook;
  syncGithubInstallation: GithubInstallation;
  trackRunmeEvent: RunmeEventData;
  unArchiveCellExecution?: Maybe<CellExecution>;
  unArchiveCellOutput: CellOutput;
  unwatchEscalation: Escalation;
  updateCellExecution: CellExecution;
  updateCellOutput: CellOutput;
  updateCellOutputTags?: Maybe<Array<Maybe<Tag>>>;
  updateCellRun: CellRun;
  updateConversation: Conversation;
  updateConversationTags?: Maybe<Array<Maybe<Tag>>>;
  updateEnvironment: Environment;
  updateEscalation: Escalation;
  updateGroup: Group;
  updateMarkdownTags?: Maybe<Array<Maybe<Tag>>>;
  updateNotebookMetadataOutput?: Maybe<Notebook>;
  updateNotebookOutputTags?: Maybe<Array<Maybe<Tag>>>;
  updateNotebookSession?: Maybe<NotebookSession>;
  updateOrganization: Organization;
  updateOrganizationUser: Organization;
  updateSlackInstallation: SlackInstallation;
  updateUser: User;
  updateUserRole: User;
  updateWorkflow?: Maybe<Workflow>;
  watchEscalation: Escalation;
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


export type MutationCreateCellOutputBookmarkArgs = {
  input: CreateBookmarkInput;
};


export type MutationCreateCellOutputGistArgs = {
  input: CreateCellOutputGistInput;
};


export type MutationCreateCellRunArgs = {
  input: CreateCellRunInput;
};


export type MutationCreateConversationBookmarkArgs = {
  input: CreateBookmarkInput;
};


export type MutationCreateEnvironmentArgs = {
  input: CreateEnvironmentInput;
};


export type MutationCreateEscalationArgs = {
  input: CreateEscalationInput;
};


export type MutationCreateEscalationBookmarkArgs = {
  input: CreateBookmarkInput;
};


export type MutationCreateExtensionCellOutputArgs = {
  input: ReporterInput;
};


export type MutationCreateGroupArgs = {
  input: CreateGroupInput;
};


export type MutationCreateMarkdownBookmarkArgs = {
  input: CreateBookmarkInput;
};


export type MutationCreateMessageArgs = {
  input: CreateMessageInput;
};


export type MutationCreateNotebookMetadataOutputGistArgs = {
  input: CreateNotebookMetadataOutputGistInput;
};


export type MutationCreateNotebookOutputBookmarkArgs = {
  input: CreateBookmarkInput;
};


export type MutationDeclineInvitationArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteBookmarkArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteCellOutputArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteCellRunArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteEnvironmentArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteGroupArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteMessageArgs = {
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


export type MutationRateMarkdownArgs = {
  input: RateMarkdownInput;
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


export type MutationShareNotebookMetadataOutputToSlackArgs = {
  input: ShareNotebookMetadataOutputToSlackInput;
};


export type MutationTrackRunmeEventArgs = {
  input: RunmeEventInput;
};


export type MutationUnArchiveCellExecutionArgs = {
  all?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['String']['input'];
};


export type MutationUnArchiveCellOutputArgs = {
  all?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['String']['input'];
};


export type MutationUnwatchEscalationArgs = {
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


export type MutationUpdateCellOutputTagsArgs = {
  input: UpdateEntityTagsInput;
};


export type MutationUpdateCellRunArgs = {
  id: Scalars['String']['input'];
  input: UpdateCellRunInput;
};


export type MutationUpdateConversationArgs = {
  id: Scalars['String']['input'];
  input: UpdateConversationInput;
};


export type MutationUpdateConversationTagsArgs = {
  input: UpdateEntityTagsInput;
};


export type MutationUpdateEnvironmentArgs = {
  id: Scalars['String']['input'];
  input: UpdateEnvironmentInput;
};


export type MutationUpdateEscalationArgs = {
  id: Scalars['String']['input'];
  input: UpdateEscalationInput;
};


export type MutationUpdateGroupArgs = {
  id: Scalars['String']['input'];
  input: UpdateGroupInput;
};


export type MutationUpdateMarkdownTagsArgs = {
  input: UpdateEntityTagsInput;
};


export type MutationUpdateNotebookMetadataOutputArgs = {
  id: Scalars['String']['input'];
  input?: InputMaybe<UpdateNotebookMetadataOutputInput>;
};


export type MutationUpdateNotebookOutputTagsArgs = {
  input: UpdateEntityTagsInput;
};


export type MutationUpdateNotebookSessionArgs = {
  id: Scalars['String']['input'];
  input: UpdateNotebookSessionInput;
};


export type MutationUpdateOrganizationArgs = {
  id: Scalars['String']['input'];
  input: UpdateOrganizationInput;
};


export type MutationUpdateOrganizationUserArgs = {
  input: UpdateOrganizationUserInput;
};


export type MutationUpdateSlackInstallationArgs = {
  input: UpdateSlackInstallationInput;
};


export type MutationUpdateUserArgs = {
  input: UpdateUserInput;
};


export type MutationUpdateUserRoleArgs = {
  input: UpdateOrgUserRoleInput;
};


export type MutationUpdateWorkflowArgs = {
  id: Scalars['String']['input'];
  input: UpdateWorkflowInput;
};


export type MutationWatchEscalationArgs = {
  id: Scalars['String']['input'];
};

export type Notebook = {
  __typename?: 'Notebook';
  Organization?: Maybe<Organization>;
  cells?: Maybe<Array<Maybe<Cell>>>;
  conversation?: Maybe<Conversation>;
  createTime?: Maybe<Scalars['DateTime']['output']>;
  currentNotebookMetadata?: Maybe<NotebookMetadata>;
  id: Scalars['String']['output'];
  notebookIdentity?: Maybe<NotebookIdentity>;
  notebookMetadataOutputs?: Maybe<Array<Maybe<NotebookMetadataOutput>>>;
  organizationId: Scalars['String']['output'];
  shareType?: Maybe<ShareType>;
  unmaskable?: Maybe<Scalars['Boolean']['output']>;
  updateTime?: Maybe<Scalars['DateTime']['output']>;
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type NotebookFilter = {
  owned?: InputMaybe<Scalars['Boolean']['input']>;
  sharedOnSlack?: InputMaybe<Scalars['Boolean']['input']>;
  sharedWithMe?: InputMaybe<Scalars['Boolean']['input']>;
  sharedWithOrg?: InputMaybe<Scalars['Boolean']['input']>;
};

export type NotebookIdentity = {
  __typename?: 'NotebookIdentity';
  createTime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  notebook?: Maybe<Notebook>;
  notebookId: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  type: NotebookIdentityType;
  updateTime: Scalars['DateTime']['output'];
  value: Scalars['String']['output'];
};

export enum NotebookIdentityType {
  Git = 'GIT',
  Lifecycle = 'LIFECYCLE'
}

export type NotebookInput = {
  __typename?: 'NotebookInput';
  createTime: Scalars['DateTime']['output'];
  data: Scalars['Bytes']['output'];
  hash: Scalars['String']['output'];
  id: Scalars['String']['output'];
  notebook?: Maybe<Notebook>;
  notebookId: Scalars['String']['output'];
  notebookMetadataList?: Maybe<Array<Maybe<NotebookMetadata>>>;
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
};

export type NotebookMetadata = {
  __typename?: 'NotebookMetadata';
  branch?: Maybe<Scalars['String']['output']>;
  cellNotebookMetadataList?: Maybe<Array<Maybe<CellNotebookMetadata>>>;
  commit?: Maybe<Scalars['String']['output']>;
  createTime: Scalars['DateTime']['output'];
  device?: Maybe<Device>;
  deviceId?: Maybe<Scalars['String']['output']>;
  extensionVersion?: Maybe<Scalars['String']['output']>;
  filePath?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  notebook?: Maybe<Notebook>;
  notebookId: Scalars['String']['output'];
  notebookIdentity?: Maybe<NotebookIdentity>;
  notebookIdentityId?: Maybe<Scalars['String']['output']>;
  notebookInput?: Maybe<NotebookInput>;
  notebookInputId?: Maybe<Scalars['String']['output']>;
  notebookSession?: Maybe<NotebookSession>;
  notebookSessionId?: Maybe<Scalars['String']['output']>;
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  repository?: Maybe<Scalars['String']['output']>;
  totalCellOutputs?: Maybe<Scalars['Int']['output']>;
  updateTime: Scalars['DateTime']['output'];
};

export type NotebookMetadataHistory = {
  __typename?: 'NotebookMetadataHistory';
  createTime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  notebook?: Maybe<Notebook>;
  notebookId: Scalars['String']['output'];
  notebookMetadata?: Maybe<NotebookMetadata>;
  notebookMetadataId: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  updateTime: Scalars['DateTime']['output'];
};

export type NotebookMetadataOutput = {
  __typename?: 'NotebookMetadataOutput';
  accessNotebookMetadataOutputs?: Maybe<Array<Maybe<AccessNotebookMetadataOutput>>>;
  bookmark?: Maybe<Bookmark>;
  conversation?: Maybe<Conversation>;
  createTime: Scalars['DateTime']['output'];
  data?: Maybe<Scalars['Bytes']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  hasMaskedData?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['String']['output'];
  isOwner?: Maybe<Scalars['Boolean']['output']>;
  maskedData?: Maybe<Scalars['Bytes']['output']>;
  notebookMetadata?: Maybe<NotebookMetadata>;
  notebookMetadataId?: Maybe<Scalars['String']['output']>;
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  resourceAccess?: Maybe<ResourceAccess>;
  shareType?: Maybe<ShareType>;
  tags?: Maybe<Array<Maybe<Tag>>>;
  unmaskable: Scalars['Boolean']['output'];
  updateTime: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type NotebookMetadataOutputSlackShare = {
  __typename?: 'NotebookMetadataOutputSlackShare';
  createTime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  notebookMetadataOutput?: Maybe<NotebookMetadataOutput>;
  notebookMetadataOutputId: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  organizationId?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type NotebookSession = {
  __typename?: 'NotebookSession';
  accessNotebookSessions?: Maybe<Array<Maybe<AccessNotebookSession>>>;
  cellOutputs?: Maybe<Array<Maybe<CellOutput>>>;
  cellOutputsCount?: Maybe<Scalars['Int']['output']>;
  createTime: Scalars['DateTime']['output'];
  escalations?: Maybe<Array<Maybe<Escalation>>>;
  filesCount?: Maybe<Scalars['Int']['output']>;
  id: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  sessionId: Scalars['String']['output'];
  shareType?: Maybe<ShareType>;
  updateTime: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
};

export type NotebookSessionFilter = {
  owned?: InputMaybe<Scalars['Boolean']['input']>;
  sharedWithMe?: InputMaybe<Scalars['Boolean']['input']>;
  sharedWithOrg?: InputMaybe<Scalars['Boolean']['input']>;
};

export type Notification = {
  __typename?: 'Notification';
  accessRequest?: Maybe<AccessRequest>;
  createTime: Scalars['DateTime']['output'];
  entityMessage?: Maybe<Message>;
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
  NotebookMetadataOutputAccessRequest = 'NOTEBOOK_METADATA_OUTPUT_ACCESS_REQUEST',
  NotebookMetadataOutputAccessRequestAccepted = 'NOTEBOOK_METADATA_OUTPUT_ACCESS_REQUEST_ACCEPTED',
  NotebookMetadataOutputAccessRequestRejected = 'NOTEBOOK_METADATA_OUTPUT_ACCESS_REQUEST_REJECTED',
  NotebookMetadataOutputMessageReply = 'NOTEBOOK_METADATA_OUTPUT_MESSAGE_REPLY',
  NotebookSessionAccessRequest = 'NOTEBOOK_SESSION_ACCESS_REQUEST',
  NotebookSessionAccessRequestAccepted = 'NOTEBOOK_SESSION_ACCESS_REQUEST_ACCEPTED',
  NotebookSessionAccessRequestRejected = 'NOTEBOOK_SESSION_ACCESS_REQUEST_REJECTED',
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
  defaultShareType?: Maybe<ShareType>;
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
  defaultShareType?: Maybe<ShareType>;
  id: Scalars['String']['output'];
  isActive?: Maybe<Scalars['Boolean']['output']>;
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
  scrollToBottom?: Maybe<Scalars['Boolean']['output']>;
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

export type PaginatedWorkflows = {
  __typename?: 'PaginatedWorkflows';
  data: Array<Workflow>;
  meta: PaginatedWorkflowsMeta;
};

export type PaginatedWorkflowsMeta = {
  __typename?: 'PaginatedWorkflowsMeta';
  total: Scalars['Int']['output'];
  totalPages: Scalars['Int']['output'];
};

export type PaginationMeta = {
  __typename?: 'PaginationMeta';
  totalPages: Scalars['Int']['output'];
  totalUnread?: Maybe<Scalars['Int']['output']>;
};

export type Permission = {
  __typename?: 'Permission';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export enum PermissionEnum {
  ActiveOrganization = 'active_organization',
  CreateBookmark = 'create_bookmark',
  CreateCellOutput = 'create_cell_output',
  CreateCellOutputAccessRequest = 'create_cell_output_access_request',
  CreateConversation = 'create_conversation',
  CreateEnvironment = 'create_environment',
  CreateEscalation = 'create_escalation',
  CreateGithubInstallation = 'create_github_installation',
  CreateGroup = 'create_group',
  CreateMessage = 'create_message',
  CreateRating = 'create_rating',
  CreateSlackInstallation = 'create_slack_installation',
  CreateUserInvitation = 'create_user_invitation',
  DeleteBookmark = 'delete_bookmark',
  DeleteCellOutput = 'delete_cell_output',
  DeleteConversation = 'delete_conversation',
  DeleteEnvironment = 'delete_environment',
  DeleteGroup = 'delete_group',
  DeleteInvitation = 'delete_invitation',
  DeleteMessage = 'delete_message',
  DeleteSlackInstallation = 'delete_slack_installation',
  OrgReadAnalytics = 'org_read_analytics',
  OrgReadEnvironment = 'org_read_environment',
  OrgReadGroup = 'org_read_group',
  OrgReadInvitation = 'org_read_invitation',
  OrgReadLog = 'org_read_log',
  OrgReadOrganizationUser = 'org_read_organization_user',
  OrgReadRole = 'org_read_role',
  OrgReadTags = 'org_read_tags',
  SetUserRole = 'set_user_role',
  UpdateAccessRequest = 'update_access_request',
  UpdateCellOutput = 'update_cell_output',
  UpdateConversation = 'update_conversation',
  UpdateEnvironment = 'update_environment',
  UpdateEscalation = 'update_escalation',
  UpdateGithubInstallation = 'update_github_installation',
  UpdateGroup = 'update_group',
  UpdateInvitation = 'update_invitation',
  UpdateMarkdownTags = 'update_markdown_tags',
  UpdateNotebookMetadataOutput = 'update_notebook_metadata_output',
  UpdateNotebookSession = 'update_notebook_session',
  UpdateNotification = 'update_notification',
  UpdateOrganization = 'update_organization',
  UpdateRating = 'update_rating',
  UpdateSlackInstallation = 'update_slack_installation',
  UpdateTags = 'update_tags',
  UpdateUser = 'update_user',
  UpdateWorkflow = 'update_workflow',
  UserReadAccess = 'user_read_access',
  UserReadAccessRequest = 'user_read_access_request',
  UserReadAnalytics = 'user_read_analytics',
  UserReadAssistant = 'user_read_assistant',
  UserReadBookmark = 'user_read_bookmark',
  UserReadCell = 'user_read_cell',
  UserReadCellInput = 'user_read_cell_input',
  UserReadCellNotebookMetadata = 'user_read_cell_notebook_metadata',
  UserReadCellOutput = 'user_read_cell_output',
  UserReadChat = 'user_read_chat',
  UserReadConversation = 'user_read_conversation',
  UserReadDevice = 'user_read_device',
  UserReadEnvironment = 'user_read_environment',
  UserReadEscalation = 'user_read_escalation',
  UserReadGithubInstallation = 'user_read_github_installation',
  UserReadGroup = 'user_read_group',
  UserReadGroupUser = 'user_read_group_user',
  UserReadInvitation = 'user_read_invitation',
  UserReadMessage = 'user_read_message',
  UserReadNotebook = 'user_read_notebook',
  UserReadNotebookIdentity = 'user_read_notebook_identity',
  UserReadNotebookInput = 'user_read_notebook_input',
  UserReadNotebookMetadata = 'user_read_notebook_metadata',
  UserReadNotebookMetadataOutput = 'user_read_notebook_metadata_output',
  UserReadNotebookSession = 'user_read_notebook_session',
  UserReadNotification = 'user_read_notification',
  UserReadOrganization = 'user_read_organization',
  UserReadOrganizationUser = 'user_read_organization_user',
  UserReadRating = 'user_read_rating',
  UserReadRole = 'user_read_role',
  UserReadSlackInstallation = 'user_read_slack_installation',
  UserReadTags = 'user_read_tags',
  UserReadUser = 'user_read_user',
  UserReadUserRole = 'user_read_user_role',
  UserReadWorkflow = 'user_read_workflow',
  WatchEscalation = 'watch_escalation'
}

/** About the Redwood queries. */
export type Query = {
  __typename?: 'Query';
  activityLogStats: AxisStat;
  assistant?: Maybe<Assistant>;
  bookmarks: Array<Bookmark>;
  cell?: Maybe<Cell>;
  cellOutput?: Maybe<CellOutput>;
  cellRun?: Maybe<CellRun>;
  cellRuns: Array<CellRun>;
  cellSuccessRateStats: AxisStat;
  cells: Array<Cell>;
  conversation?: Maybe<Conversation>;
  conversationActivityStats: AxisStat;
  conversations: Array<Conversation>;
  environment?: Maybe<Environment>;
  environments: Array<Environment>;
  escalation?: Maybe<Escalation>;
  escalations?: Maybe<Array<Escalation>>;
  firstCell?: Maybe<Cell>;
  getSlackChannels?: Maybe<Array<Maybe<SlackChannel>>>;
  githubInstallation?: Maybe<GithubInstallation>;
  group?: Maybe<Group>;
  groups: Array<Group>;
  invitation: Invitation;
  log?: Maybe<Log>;
  logTypes: Array<LogType>;
  logs: PaginatedLogs;
  markdownsStats: AxisStat;
  me?: Maybe<User>;
  notebook?: Maybe<Notebook>;
  notebookActivityStats: AxisStat;
  notebookMetadata?: Maybe<NotebookMetadata>;
  notebookMetadataOutput?: Maybe<NotebookMetadataOutput>;
  notebookSession?: Maybe<NotebookSession>;
  notebookSessions?: Maybe<Array<Maybe<NotebookSession>>>;
  notebooks?: Maybe<Array<Maybe<Notebook>>>;
  notifications: PaginatedNotifications;
  organization?: Maybe<Organization>;
  organizations: Array<Organization>;
  /** Fetches the Redwood root schema. */
  redwood?: Maybe<Redwood>;
  roles: Array<Role>;
  rolesInfo?: Maybe<RolesInfo>;
  searchKnowledgeBase?: Maybe<Array<Maybe<KnowledgeBaseResult>>>;
  sharedActivityStats: AxisStat;
  slackInstallation?: Maybe<SlackInstallation>;
  tags: Array<Tag>;
  totalCellOutputs: Scalars['Int']['output'];
  totalNotebooks: Scalars['Int']['output'];
  userEnvironments: Array<Environment>;
  workflow: Workflow;
  workflows: PaginatedWorkflows;
};


/** About the Redwood queries. */
export type QueryActivityLogStatsArgs = {
  filters: AnalyticFilterInput;
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
export type QueryCellRunArgs = {
  id: Scalars['String']['input'];
};


/** About the Redwood queries. */
export type QueryCellSuccessRateStatsArgs = {
  filters: AnalyticFilterInput;
};


/** About the Redwood queries. */
export type QueryCellsArgs = {
  filters?: InputMaybe<CellOutputFilter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


/** About the Redwood queries. */
export type QueryConversationArgs = {
  id: Scalars['String']['input'];
};


/** About the Redwood queries. */
export type QueryConversationActivityStatsArgs = {
  filters: AnalyticFilterInput;
};


/** About the Redwood queries. */
export type QueryConversationsArgs = {
  referenceId?: InputMaybe<Scalars['String']['input']>;
  referenceTable?: InputMaybe<Scalars['String']['input']>;
};


/** About the Redwood queries. */
export type QueryEnvironmentArgs = {
  id: Scalars['String']['input'];
};


/** About the Redwood queries. */
export type QueryEscalationArgs = {
  id: Scalars['String']['input'];
};


/** About the Redwood queries. */
export type QueryEscalationsArgs = {
  filters?: InputMaybe<EscalationFilter>;
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
export type QueryMarkdownsStatsArgs = {
  filters: AnalyticFilterInput;
};


/** About the Redwood queries. */
export type QueryNotebookArgs = {
  filters?: InputMaybe<NotebookFilter>;
  id: Scalars['String']['input'];
};


/** About the Redwood queries. */
export type QueryNotebookActivityStatsArgs = {
  filters: AnalyticFilterInput;
};


/** About the Redwood queries. */
export type QueryNotebookMetadataArgs = {
  id: Scalars['String']['input'];
};


/** About the Redwood queries. */
export type QueryNotebookMetadataOutputArgs = {
  id: Scalars['String']['input'];
};


/** About the Redwood queries. */
export type QueryNotebookSessionArgs = {
  id: Scalars['String']['input'];
};


/** About the Redwood queries. */
export type QueryNotebookSessionsArgs = {
  filters?: InputMaybe<NotebookSessionFilter>;
};


/** About the Redwood queries. */
export type QueryNotebooksArgs = {
  filters?: InputMaybe<NotebookFilter>;
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
export type QuerySearchKnowledgeBaseArgs = {
  input?: InputMaybe<SearchKnowledgeBaseInput>;
};


/** About the Redwood queries. */
export type QuerySharedActivityStatsArgs = {
  filters: AnalyticFilterInput;
};


/** About the Redwood queries. */
export type QueryTotalCellOutputsArgs = {
  filters?: InputMaybe<CellOutputFilter>;
};


/** About the Redwood queries. */
export type QueryTotalNotebooksArgs = {
  filters?: InputMaybe<NotebookFilter>;
};


/** About the Redwood queries. */
export type QueryWorkflowArgs = {
  id: Scalars['String']['input'];
};


/** About the Redwood queries. */
export type QueryWorkflowsArgs = {
  all?: InputMaybe<Scalars['Boolean']['input']>;
  fileName?: InputMaybe<Scalars['String']['input']>;
  page: Scalars['Int']['input'];
  take?: InputMaybe<Scalars['Int']['input']>;
};

export type RateMarkdownInput = {
  markdownId?: InputMaybe<Scalars['String']['input']>;
  rating?: InputMaybe<Scalars['Int']['input']>;
};

export type Rating = {
  __typename?: 'Rating';
  createTime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  organizationId?: Maybe<Scalars['String']['output']>;
  rating: Scalars['Int']['output'];
  updateTime: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
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

export type ReporterCellExecutionSummaryInput = {
  executionOrder?: InputMaybe<UInt32>;
  success?: InputMaybe<BooleanInput>;
  timing?: InputMaybe<ReporterExecutionSummaryTimingInput>;
};

export type ReporterCellInput = {
  executionSummary?: InputMaybe<ReporterCellExecutionSummaryInput>;
  kind?: InputMaybe<Scalars['Int']['input']>;
  languageId?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<ReporterCellMetadataInput>;
  outputs: Array<ReporterCellOutputInput>;
  textRange?: InputMaybe<ReporterTextRangeInput>;
  value: Scalars['String']['input'];
};

export type ReporterCellMetadataInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  mimeType?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type ReporterCellOutputInput = {
  items: Array<ReporterCellOutputItemInput>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  processInfo?: InputMaybe<ReporterCellOutputProcessInfoInput>;
};

export type ReporterCellOutputItemInput = {
  data: Scalars['Bytes']['input'];
  mime?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};

export type ReporterCellOutputProcessInfoInput = {
  exitReason?: InputMaybe<ReporterProcessInfoExitReasonInput>;
  pid?: InputMaybe<Int64Input>;
};

export type ReporterDeviceInput = {
  arch?: InputMaybe<Scalars['String']['input']>;
  hostname?: InputMaybe<Scalars['String']['input']>;
  macAddress?: InputMaybe<Scalars['String']['input']>;
  platform?: InputMaybe<Scalars['String']['input']>;
  release?: InputMaybe<Scalars['String']['input']>;
  shell?: InputMaybe<Scalars['String']['input']>;
  vendor?: InputMaybe<Scalars['String']['input']>;
  vsAppHost?: InputMaybe<Scalars['String']['input']>;
  vsAppName?: InputMaybe<Scalars['String']['input']>;
  vsAppSessionId?: InputMaybe<Scalars['String']['input']>;
  vsMachineId?: InputMaybe<Scalars['String']['input']>;
  vsMetadata?: InputMaybe<Scalars['JSON']['input']>;
};

export type ReporterExecutionSummaryTimingInput = {
  endTime?: InputMaybe<Int64Input>;
  startTime?: InputMaybe<Int64Input>;
};

export type ReporterExtensionInput = {
  autoSave?: InputMaybe<Scalars['Boolean']['input']>;
  device?: InputMaybe<ReporterDeviceInput>;
  file?: InputMaybe<ReporterFileInput>;
  git?: InputMaybe<ReporterGitInput>;
  session: ReporterSessionInput;
  shareType?: InputMaybe<ShareType>;
};

export type ReporterFileInput = {
  content?: InputMaybe<Scalars['Bytes']['input']>;
  path?: InputMaybe<Scalars['String']['input']>;
};

export type ReporterFrontmatterInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  cwd?: InputMaybe<Scalars['String']['input']>;
  runme: ReporterFrontmatterRunmeInput;
  shell?: InputMaybe<Scalars['String']['input']>;
  skipPrompts?: InputMaybe<Scalars['Boolean']['input']>;
  terminalRows?: InputMaybe<Scalars['String']['input']>;
};

export type ReporterFrontmatterRunmeInput = {
  id: Scalars['String']['input'];
  session: ReporterRunmeSessionInput;
  version?: InputMaybe<Scalars['String']['input']>;
};

export type ReporterGitInput = {
  branch?: InputMaybe<Scalars['String']['input']>;
  commit?: InputMaybe<Scalars['String']['input']>;
  repository?: InputMaybe<Scalars['String']['input']>;
};

export type ReporterInput = {
  extension: ReporterExtensionInput;
  notebook: ReporterNotebookInput;
};

export type ReporterNotebookInput = {
  cells: Array<ReporterCellInput>;
  frontmatter: ReporterFrontmatterInput;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
};

export type ReporterProcessInfoExitReasonInput = {
  code?: InputMaybe<UInt32>;
  type?: InputMaybe<Scalars['String']['input']>;
};

export enum ReporterRunmeIdentity {
  RunmeIdentityAll = 'RUNME_IDENTITY_ALL',
  RunmeIdentityCell = 'RUNME_IDENTITY_CELL',
  RunmeIdentityDocument = 'RUNME_IDENTITY_DOCUMENT',
  RunmeIdentityUnspecified = 'RUNME_IDENTITY_UNSPECIFIED'
}

export type ReporterRunmeSessionDocumentInput = {
  relativePath?: InputMaybe<Scalars['String']['input']>;
};

export type ReporterRunmeSessionInput = {
  document?: InputMaybe<ReporterRunmeSessionDocumentInput>;
  id: Scalars['String']['input'];
};

export type ReporterSessionInput = {
  maskedOutput?: InputMaybe<Scalars['Bytes']['input']>;
  plainOutput?: InputMaybe<Scalars['Bytes']['input']>;
};

export type ReporterTextRangeInput = {
  end?: InputMaybe<Scalars['Int']['input']>;
  start?: InputMaybe<Scalars['Int']['input']>;
};

export type ResourceAccess = {
  __typename?: 'ResourceAccess';
  accessRequested?: Maybe<Scalars['Boolean']['output']>;
  hasAccess?: Maybe<Scalars['Boolean']['output']>;
  id?: Maybe<Scalars['String']['output']>;
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

export type RoleWithPermissions = {
  __typename?: 'RoleWithPermissions';
  createTime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  permissions: Array<Permission>;
  updateTime: Scalars['DateTime']['output'];
};

export type RolesInfo = {
  __typename?: 'RolesInfo';
  permissions: Array<Permission>;
  roles: Array<RoleWithPermissions>;
};

export type RunCellDataInput = {
  cell: RunmeEventCell;
  executionSummary: RunmeEventExecutionSummaryInput;
  notebook: RunmeEventNotebook;
};

export type RunmeEventCell = {
  id: Scalars['String']['input'];
};

export type RunmeEventData = {
  __typename?: 'RunmeEventData';
  status: Scalars['String']['output'];
};

export type RunmeEventDataInput = {
  runCellData?: InputMaybe<RunCellDataInput>;
};

export type RunmeEventExecutionSummaryInput = {
  success: Scalars['Boolean']['input'];
  timing?: InputMaybe<RunmeEventExecutionSummaryTimingInput>;
};

export type RunmeEventExecutionSummaryTimingInput = {
  elapsedTime: Scalars['Int']['input'];
  endTime: Scalars['String']['input'];
  startTime: Scalars['String']['input'];
};

export type RunmeEventInput = {
  data: RunmeEventDataInput;
  type: RunmeEventInputType;
};

export enum RunmeEventInputType {
  RunCell = 'runCell'
}

export type RunmeEventNotebook = {
  id: Scalars['String']['input'];
  path: Scalars['String']['input'];
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
  internal?: InputMaybe<Scalars['Boolean']['input']>;
  metadataKeys?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  query: Scalars['String']['input'];
};

export type SearchKnowledgeBaseInput = {
  dateRanges?: InputMaybe<DataRageFilter>;
  entityTypes?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  query: Scalars['String']['input'];
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type ShareCellOutputToSlackInput = {
  cellOutputId: Scalars['String']['input'];
  channelId: Scalars['String']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
};

export type ShareNotebookMetadataOutputToSlackInput = {
  channelId: Scalars['String']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  notebookMetadataOutputId: Scalars['String']['input'];
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

export type Tag = {
  __typename?: 'Tag';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['String']['output'];
};

export type UInt32 = {
  value?: InputMaybe<Scalars['Int']['input']>;
};

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

export type UpdateCellOutputInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  groupIds?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  notify?: InputMaybe<Scalars['Boolean']['input']>;
  shareType?: InputMaybe<ShareType>;
  unmaskable?: InputMaybe<Scalars['Boolean']['input']>;
  userIds?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type UpdateCellRunInput = {
  cellId?: InputMaybe<Scalars['String']['input']>;
  createTime?: InputMaybe<Scalars['DateTime']['input']>;
  elapsedTime?: InputMaybe<Scalars['Int']['input']>;
  endTime?: InputMaybe<Scalars['DateTime']['input']>;
  isSuccess?: InputMaybe<Scalars['Boolean']['input']>;
  organizationId?: InputMaybe<Scalars['String']['input']>;
  startTime?: InputMaybe<Scalars['DateTime']['input']>;
  updateTime?: InputMaybe<Scalars['DateTime']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateConversationInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateEntityTagsInput = {
  id: Scalars['String']['input'];
  tagNames?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdateEnvironmentInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  groupIds?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  name?: InputMaybe<Scalars['String']['input']>;
  userIds?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type UpdateEscalationInput = {
  assignee?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<EscalationStatus>;
  watchers?: InputMaybe<Array<Scalars['String']['input']>>;
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

export type UpdateNotebookInput = {
  description?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateNotebookMetadataOutputInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  groupIds?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  shareType?: InputMaybe<ShareType>;
  unmaskable?: InputMaybe<Scalars['Boolean']['input']>;
  userIds?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type UpdateNotebookSessionInput = {
  groupIds?: InputMaybe<Array<Scalars['String']['input']>>;
  shareType?: InputMaybe<ShareType>;
  userIds?: InputMaybe<Array<Scalars['String']['input']>>;
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
  defaultShareType?: InputMaybe<ShareType>;
  metadata?: InputMaybe<OrgMetadataInput>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOrganizationUserInput = {
  defaultShareType?: InputMaybe<ShareType>;
  scrollToBottom?: InputMaybe<Scalars['Boolean']['input']>;
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

export type UpdateTagInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  organizationId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUserInput = {
  useLastActiveOrganization?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateUserRoleInput = {
  createTime?: InputMaybe<Scalars['DateTime']['input']>;
  organizationId?: InputMaybe<Scalars['String']['input']>;
  roleId?: InputMaybe<Scalars['String']['input']>;
  updateTime?: InputMaybe<Scalars['DateTime']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateWorkflowInput = {
  description?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  SlackInstallations?: Maybe<Array<Maybe<SlackInstallation>>>;
  auth0Id?: Maybe<Scalars['String']['output']>;
  cellRuns?: Maybe<Array<CellRun>>;
  createTime?: Maybe<Scalars['DateTime']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  groupUsers?: Maybe<Array<Maybe<GroupUser>>>;
  id: Scalars['String']['output'];
  organizationUsers?: Maybe<Array<Maybe<OrganizationUser>>>;
  photoUrl?: Maybe<Scalars['String']['output']>;
  signupOrigin?: Maybe<SignupOrigin>;
  updateTime?: Maybe<Scalars['DateTime']['output']>;
  useLastActiveOrganization?: Maybe<Scalars['Boolean']['output']>;
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
  bookmark?: Maybe<Bookmark>;
  createTime?: Maybe<Scalars['DateTime']['output']>;
  data?: Maybe<Scalars['Bytes']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  fileName: Scalars['String']['output'];
  githubInstallation?: Maybe<GithubInstallation>;
  githubInstallationId?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  organizationId?: Maybe<Scalars['String']['output']>;
  path: Scalars['String']['output'];
  rating?: Maybe<Rating>;
  repository: Scalars['String']['output'];
  tags?: Maybe<Array<Maybe<Tag>>>;
  totalRatings?: Maybe<Scalars['Int']['output']>;
  updateTime?: Maybe<Scalars['DateTime']['output']>;
};

export type _CreateNotebookInput = {
  lifecycleIdentityId: Scalars['String']['input'];
};

export type _DeviceInput = {
  arch?: InputMaybe<Scalars['String']['input']>;
  hostname?: InputMaybe<Scalars['String']['input']>;
  macAddress?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  platform?: InputMaybe<Scalars['String']['input']>;
  release?: InputMaybe<Scalars['String']['input']>;
  shell?: InputMaybe<Scalars['String']['input']>;
  vendor?: InputMaybe<Scalars['String']['input']>;
  vsAppHost?: InputMaybe<Scalars['String']['input']>;
  vsAppName?: InputMaybe<Scalars['String']['input']>;
  vsAppSessionId?: InputMaybe<Scalars['String']['input']>;
  vsMachineId?: InputMaybe<Scalars['String']['input']>;
};

export type ArchiveCellOutputMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type ArchiveCellOutputMutation = { __typename?: 'Mutation', archiveCellOutput: { __typename?: 'CellOutput', id: string } };

export type CreateCellExecutionMutationVariables = Exact<{
  input: CreateCellExecutionInput;
}>;


export type CreateCellExecutionMutation = { __typename?: 'Mutation', createCellExecution: { __typename?: 'CellExecution', id: string, htmlUrl?: string | null, exitCode: number, isSlackReady: boolean } };

export type CreateExtensionCellOutputMutationVariables = Exact<{
  input: ReporterInput;
}>;


export type CreateExtensionCellOutputMutation = { __typename?: 'Mutation', createExtensionCellOutput: { __typename?: 'CellOutput', id: string, htmlUrl?: string | null, exitCode: number, isSlackReady?: boolean | null } };

export type CreateEscalationMutationVariables = Exact<{
  input: CreateEscalationInput;
}>;


export type CreateEscalationMutation = { __typename?: 'Mutation', createEscalation: { __typename?: 'Escalation', id: string, escalationUrl?: string | null } };

export type GetAllWorkflowsQueryVariables = Exact<{
  page: Scalars['Int']['input'];
  take?: InputMaybe<Scalars['Int']['input']>;
  fileName?: InputMaybe<Scalars['String']['input']>;
  all?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type GetAllWorkflowsQuery = { __typename?: 'Query', workflows: { __typename: 'PaginatedWorkflows', data: Array<{ __typename: 'Workflow', id: string, description?: string | null, fileName: string, path: string, repository: string, organizationId?: string | null, totalRatings?: number | null, rating?: { __typename: 'Rating', id: string, rating: number } | null, bookmark?: { __typename: 'Bookmark', id: string } | null, tags?: Array<{ __typename: 'Tag', id: string, name: string } | null> | null }>, meta: { __typename: 'PaginatedWorkflowsMeta', totalPages: number, total: number } } };

export type GetOneWorkflowQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetOneWorkflowQuery = { __typename?: 'Query', workflow: { __typename: 'Workflow', id: string, description?: string | null, fileName: string, path: string, repository: string, data?: any | null, organizationId?: string | null, bookmark?: { __typename: 'Bookmark', id: string } | null, tags?: Array<{ __typename: 'Tag', id: string, name: string } | null> | null } };

export type GetUserEnvironmentsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserEnvironmentsQuery = { __typename?: 'Query', userEnvironments: Array<{ __typename?: 'Environment', id: string, name: string, description?: string | null }> };

export type TrackRunmeEventMutationVariables = Exact<{
  input: RunmeEventInput;
}>;


export type TrackRunmeEventMutation = { __typename?: 'Mutation', trackRunmeEvent: { __typename?: 'RunmeEventData', status: string } };

export type UnArchiveCellOutputMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type UnArchiveCellOutputMutation = { __typename?: 'Mutation', unArchiveCellOutput: { __typename?: 'CellOutput', id: string } };

export type UpdateCellOutputMutationVariables = Exact<{
  id: Scalars['String']['input'];
  input: UpdateCellOutputInput;
}>;


export type UpdateCellOutputMutation = { __typename?: 'Mutation', updateCellOutput: { __typename?: 'CellOutput', id: string, htmlUrl?: string | null, exitCode: number, isSlackReady?: boolean | null } };


export const ArchiveCellOutputDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ArchiveCellOutput"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"archiveCellOutput"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<ArchiveCellOutputMutation, ArchiveCellOutputMutationVariables>;
export const CreateCellExecutionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCellExecution"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateCellExecutionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCellExecution"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"htmlUrl"}},{"kind":"Field","name":{"kind":"Name","value":"exitCode"}},{"kind":"Field","name":{"kind":"Name","value":"isSlackReady"}}]}}]}}]} as unknown as DocumentNode<CreateCellExecutionMutation, CreateCellExecutionMutationVariables>;
export const CreateExtensionCellOutputDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateExtensionCellOutput"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ReporterInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createExtensionCellOutput"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"htmlUrl"}},{"kind":"Field","name":{"kind":"Name","value":"exitCode"}},{"kind":"Field","name":{"kind":"Name","value":"isSlackReady"}}]}}]}}]} as unknown as DocumentNode<CreateExtensionCellOutputMutation, CreateExtensionCellOutputMutationVariables>;
export const CreateEscalationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateEscalation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateEscalationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createEscalation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"escalationUrl"}}]}}]}}]} as unknown as DocumentNode<CreateEscalationMutation, CreateEscalationMutationVariables>;
export const GetAllWorkflowsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getAllWorkflows"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"page"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"take"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"fileName"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"all"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workflows"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"page"},"value":{"kind":"Variable","name":{"kind":"Name","value":"page"}}},{"kind":"Argument","name":{"kind":"Name","value":"take"},"value":{"kind":"Variable","name":{"kind":"Name","value":"take"}}},{"kind":"Argument","name":{"kind":"Name","value":"fileName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"fileName"}}},{"kind":"Argument","name":{"kind":"Name","value":"all"},"value":{"kind":"Variable","name":{"kind":"Name","value":"all"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"data"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"fileName"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"repository"}},{"kind":"Field","name":{"kind":"Name","value":"rating"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"rating"}},{"kind":"Field","name":{"kind":"Name","value":"__typename"}}]}},{"kind":"Field","name":{"kind":"Name","value":"organizationId"}},{"kind":"Field","name":{"kind":"Name","value":"totalRatings"}},{"kind":"Field","name":{"kind":"Name","value":"bookmark"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"__typename"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tags"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"__typename"}}]}},{"kind":"Field","name":{"kind":"Name","value":"__typename"}}]}},{"kind":"Field","name":{"kind":"Name","value":"meta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalPages"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"__typename"}}]}},{"kind":"Field","name":{"kind":"Name","value":"__typename"}}]}}]}}]} as unknown as DocumentNode<GetAllWorkflowsQuery, GetAllWorkflowsQueryVariables>;
export const GetOneWorkflowDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getOneWorkflow"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workflow"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"fileName"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"repository"}},{"kind":"Field","name":{"kind":"Name","value":"data"}},{"kind":"Field","name":{"kind":"Name","value":"organizationId"}},{"kind":"Field","name":{"kind":"Name","value":"bookmark"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"__typename"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tags"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"__typename"}}]}},{"kind":"Field","name":{"kind":"Name","value":"__typename"}}]}}]}}]} as unknown as DocumentNode<GetOneWorkflowQuery, GetOneWorkflowQueryVariables>;
export const GetUserEnvironmentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getUserEnvironments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userEnvironments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}}]}}]} as unknown as DocumentNode<GetUserEnvironmentsQuery, GetUserEnvironmentsQueryVariables>;
export const TrackRunmeEventDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"TrackRunmeEvent"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RunmeEventInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"trackRunmeEvent"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<TrackRunmeEventMutation, TrackRunmeEventMutationVariables>;
export const UnArchiveCellOutputDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnArchiveCellOutput"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unArchiveCellOutput"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UnArchiveCellOutputMutation, UnArchiveCellOutputMutationVariables>;
export const UpdateCellOutputDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateCellOutput"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateCellOutputInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateCellOutput"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"htmlUrl"}},{"kind":"Field","name":{"kind":"Name","value":"exitCode"}},{"kind":"Field","name":{"kind":"Name","value":"isSlackReady"}}]}}]}}]} as unknown as DocumentNode<UpdateCellOutputMutation, UpdateCellOutputMutationVariables>;