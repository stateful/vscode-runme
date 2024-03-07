import {
  NotebookCellKind,
  TaskDefinition,
  type Terminal,
  TerminalDimensions,
  Uri,
  ExtensionContext,
  NotebookRendererMessaging,
  NotebookEditor,
} from 'vscode'
import { z } from 'zod'
import { Bus } from 'tangle'
import { InstanceStateName, MonitoringState, _InstanceType } from '@aws-sdk/client-ec2'

import { OutputType, ClientMessages } from './constants'
import { SafeCellAnnotationsSchema, SafeNotebookAnnotationsSchema } from './schema'
import type { IRunnerProgramSession } from './extension/runner'
import type * as Grpc from './extension/grpc/serializerTypes'
import { IWorkflowRun } from './extension/services/types'
import { Kernel } from './extension/kernel'
import { IAppToken } from './extension/services/runme'
import type { TerminalConfiguration } from './utils/configuration'
import { GCPSupportedView } from './extension/resolvers/gcpResolver'
import { AWSSupportedView } from './extension/resolvers/awsResolver'
import { MonitorEnvResponseSnapshot_SnapshotEnv } from './extension/grpc/runnerTypes'

export interface SyncSchema {
  onCommand?: {
    panelId?: string
    name: string
  }
  onAppToken?: IAppToken
  onSave?: {
    cellId: string
  }
  onArchiveCell?: {
    cellId: string
  }
  onCellArchived?: {
    cellId: string
  }
}

export type SyncSchemaBus = Bus<SyncSchema>

export namespace Serializer {
  export type Notebook = {
    cells: Cell[]
    metadata?: Metadata
    frontmatter?: Grpc.Frontmatter
  }

  export type Cell = Omit<
    Grpc.Cell,
    'kind' | 'metadata' | 'languageId' | 'outputs' | 'executionSummary'
  > & {
    metadata?: Metadata
    kind: NotebookCellKind
    languageId?: string
  }

  export interface Wasm {
    Runme: {
      deserialize: (content: string) => Promise<Notebook>
      serialize: (content: string) => Promise<string>
    }
  }

  export interface Metadata {
    id?: string
    name?: string
    background?: string
    interactive?: string
    closeTerminalOnSuccess?: string
    mimeType?: string
    promptEnv?: string
    category?: string
    ['runme.dev/name']?: string
    ['runme.dev/nameGenerated']?: string
    ['runme.dev/id']?: string
    ['runme.dev/denoState']?: DenoState
    ['runme.dev/vercelState']?: VercelState
    ['runme.dev/githubState']?: GitHubState
    ['runme.dev/frontmatterParsed']?: Grpc.Frontmatter
    ['runme.dev/textRange']?: Grpc.Cell['textRange']
    ['runme.dev/gcpState']?: GCPState
  }
}

export interface ICellOutput<T extends OutputType> {
  type: T
  output: Payload[T]
}

export type CellOutputPayload<T extends OutputType> = T extends any ? ICellOutput<T> : never

export type CellOutput = CellOutputPayload<OutputType>

export interface DenoState {
  promoted?: boolean
  deployed?: boolean
  project?: any
  deployments?: any[]
  error?: any
}

export interface VercelState {
  payload?: any
  outputItems: string[]
  type?: string
  error?: any
}

export interface GitHubState {
  repo?: string
  owner?: string
  workflow_id?: string
  content?: string
  ref?: string
  error?: any
  cellId?: string
}

export interface StringIndexable {
  [key: string]: any
}

export interface GcpGkeCluster extends StringIndexable {
  clusterId: string
  status: string
  name: string
  location: string
  nodes: number
  clusterLink: string
  vCPUs: number
  totalMemory: number
  mode: string
  labels?: { [k: string]: string } | null
  statusMessage: string | null | undefined
}

export interface InstancePool {
  name: string
  link: string
}

export enum GceActionType {
  StopVMInstance = 'stopVmInstance',
  StartVMInstance = 'startVmInstance',
  SuspendVMInstance = 'suspendVmInstance',
  ConnectViaSSH = 'connectViaSsh',
}

export enum InstanceStatusType {
  Stopping = 'STOPPING',
  Suspending = 'SUSPENDING',
  Staging = 'STAGING',
  Repairing = 'REPAIRING',
  Provisioning = 'PROVISIONING',
  Suspended = 'SUSPENDED',
  Terminated = 'TERMINATED',
  Running = 'RUNNING',
}

export enum AWSActionType {
  ConnectViaSSH = 'connectViaSsh',
  EC2InstanceDetails = 'aws:ec2InstanceDetails',
}

export interface GcpGceVMInstance extends StringIndexable {
  instanceId: string
  status: InstanceStatusType
  name: string
  zone: string
  network: {
    name: string
    interfaceLink: string
    internal: {
      ip: string
    }
    external: {
      ip: string
    }
  }
  pools?: InstancePool[]
}

export interface GcpGkeClustersState {
  project?: string
  zone?: string
  clusters?: GcpGkeCluster[]
  view: GCPSupportedView.CLUSTERS
  cellId: string
}

export interface GcpGkeClusterState {
  project?: string
  zone?: string
  cluster?: string | undefined
  clusterDetails?: any
  cellId: string
  view: GCPSupportedView.CLUSTER
  location?: string | undefined
}

export interface GcpGceVMInstancesState {
  project?: string
  zone?: string
  instances?: GcpGceVMInstance[]
  view: GCPSupportedView.VM_INSTANCES
  cellId: string
}

export type GCPState = GcpGkeClustersState | GcpGkeClusterState | GcpGceVMInstancesState

export type AWSState = AWSEC2InstanceState | AWSEC2InstanceDetailsState

export interface AWSEC2Instance extends StringIndexable {
  name: string
  instanceId: string | undefined
  instanceState: InstanceStateName | undefined
  type: _InstanceType | undefined
  zone: string | undefined
  publicDns: string | undefined
  publicIp: string | undefined
  monitoring: MonitoringState | undefined
  securityGroup: string
  keyName: string | undefined
  launchTime: Date | undefined
  platform: string | undefined
}

export interface AWSEC2InstanceState {
  instances: AWSEC2Instance[]
  cellId: string
  region: string
  view: AWSSupportedView.EC2Instances
}

export interface AWSEC2InstanceDetailsState {
  instance: AWSEC2Instance | undefined
  cellId: string
  region: string
  view: AWSSupportedView.EC2InstanceDetails
}

interface Payload {
  [OutputType.error]: string
  [OutputType.deno]?: DenoState
  [OutputType.vercel]: VercelState
  [OutputType.outputItems]: OutputItemsPayload
  [OutputType.annotations]: {
    annotations?: CellAnnotations
    validationErrors?: CellAnnotationsErrorResult
    id?: string
  }
  [OutputType.terminal]: TerminalConfiguration & {
    ['runme.dev/id']: string
    content?: string
    initialRows?: number
    enableShareButton: boolean
    isAutoSaveEnabled: boolean
  }
  [OutputType.github]?: GitHubState
  [OutputType.stdout]: object
  [OutputType.gcp]?: GcpGkeClusterState | GcpGkeClustersState | GcpGceVMInstancesState
  [OutputType.aws]?: AWSState
}

export type ClientMessage<T extends ClientMessages> = T extends any
  ? {
      type: T
      output: ClientMessagePayload[T]
    }
  : never
export interface ClientMessagePayload {
  [ClientMessages.denoUpdate]: DenoState
  [ClientMessages.denoPromote]: {
    id: string
    productionDeployment: string
  }
  [ClientMessages.vercelProd]: {
    cellIndex: number
  }
  [ClientMessages.mutateAnnotations]: {
    annotations: CellAnnotations
  }
  [ClientMessages.infoMessage]: string
  [ClientMessages.errorMessage]: string
  [ClientMessages.terminalStdout]: {
    ['runme.dev/id']: string
    data: Uint8Array | string
  }
  [ClientMessages.terminalStderr]: {
    ['runme.dev/id']: string
    data: Uint8Array | string
  }
  [ClientMessages.terminalStdin]: {
    ['runme.dev/id']: string
    input: string
  }
  [ClientMessages.terminalFocus]: { ['runme.dev/id']: string }
  [ClientMessages.terminalResize]: {
    ['runme.dev/id']: string
    terminalDimensions: TerminalDimensions
  }
  [ClientMessages.terminalOpen]: {
    ['runme.dev/id']: string
    terminalDimensions?: TerminalDimensions
  }
  [ClientMessages.onProgramClose]: {
    ['runme.dev/id']: string
    code: number | void
    escalationButton: boolean
  }
  [ClientMessages.activeThemeChanged]: string
  [ClientMessages.openLink]: string
  [ClientMessages.closeCellOutput]: {
    id: string
    outputType: OutputType
  }
  [ClientMessages.displayPrompt]: {
    placeholder: string
    isSecret: boolean
    title: string
    id: string
  }
  [ClientMessages.onPrompt]: {
    answer: string | undefined
    id: string
  }
  [ClientMessages.onCategoryChange]: void
  [ClientMessages.githubWorkflowDispatch]: {
    inputs: Record<string, string>
    repo: string
    owner: string
    workflow_id: string
    ref: string
    cellId: string
  }
  [ClientMessages.githubWorkflowDeploy]: {
    itFailed: boolean
    reason?: string
    workflowRun?: IWorkflowRun
    workflowId: string
    cellId: string
  }
  [ClientMessages.githubWorkflowStatusUpdate]: {
    workflowRun?: IWorkflowRun
    cellId: string
  }
  [ClientMessages.setState]: {
    state: string
    value: string[]
    id: string
  }
  [ClientMessages.getState]: {
    state: string
    id: string
  }
  [ClientMessages.onGetState]: {
    state: string
    value: string | string[]
    id: string
  }
  [ClientMessages.platformApiRequest]: {
    data: any
    id: string
    hasErrors?: boolean
    method: APIMethod
  }
  [ClientMessages.platformApiResponse]: {
    data: any
    id: string
    escalationButton: boolean
    hasErrors?: boolean
  }
  [ClientMessages.cloudApiRequest]: {
    data: any
    id: string
    hasErrors?: boolean
    method: APIMethod
  }
  [ClientMessages.cloudApiResponse]: {
    data: any
    id: string
    escalationButton: boolean
    hasErrors?: boolean
  }
  [ClientMessages.optionsMessage]: {
    title: string
    id: string
    options: any[]
    modal?: boolean
    telemetryEvent?: string
  }
  [ClientMessages.onOptionsMessage]: {
    id: string
    option: string | undefined
  }
  [ClientMessages.openExternalLink]: {
    link: string
    telemetryEvent: string
  }
  [ClientMessages.copyTextToClipboard]: {
    id: string
    text: string
  }
  [ClientMessages.onCopyTextToClipboard]: {
    id: string
  }
  [ClientMessages.tangleEvent]: {
    data: any
    webviewId: string
  }
  [ClientMessages.gcpClusterCheckStatus]: {
    clusterName: string
    projectId: string
    location: string
    cellId: string
    clusterId: string
    status: string
  }
  [ClientMessages.gcpResourceStatusChanged]: {
    resourceId: string
    status: string
    cellId: string
    hasErrors: boolean
    error?: string | undefined
  }
  [ClientMessages.gcpClusterDetails]: {
    cellId: string
    cluster: string
    location: string
    projectId: string
  }
  [ClientMessages.gcpClusterDetailsResponse]: {
    cellId: string
    itFailed: boolean
    reason: string
    data: any
    executedInNewCell: boolean
    cluster: string
  }
  [ClientMessages.gcpClusterDetailsNewCell]: {
    cellId: string
    cluster: string
    location: string
    project: string
  }
  [ClientMessages.gcpVMInstanceAction]: {
    cellId: string
    instance: string
    zone: string
    project: string
    status: InstanceStatusType
    action: GceActionType
  }
  [ClientMessages.awsEC2Instances]: {
    cellId: string
    region: string
    view: AWSSupportedView
  }
  [ClientMessages.awsEC2InstanceAction]: {
    cellId: string
    instance: string
    region: string
    action: AWSActionType
  }
}

export interface OutputItemsPayload {
  content: string
  mime: string
  id: string
}

export interface RunmeTaskDefinition extends TaskDefinition {
  type: 'runme'
  filePath: string
  command: string
  isBackground?: boolean
  closeTerminalOnSuccess?: boolean
  cwd?: string
}

export type CellAnnotations = z.infer<typeof SafeCellAnnotationsSchema>

export type NotebookAnnotations = z.infer<typeof SafeNotebookAnnotationsSchema>

export type allKeys<T> = T extends any ? keyof T : never

export type CellAnnotationErrorKey = {
  [P in allKeys<CellAnnotations>]?: string[]
}

export type CellAnnotationsErrorResult = {
  hasErrors: boolean
  errors?: CellAnnotationErrorKey
  originalAnnotations: CellAnnotations
}

export interface DisposableAsync {
  dispose(): Promise<void>
}

export interface RunmeTerminal extends Terminal {
  runnerSession?: IRunnerProgramSession
}

export interface NotebookToolbarCommand {
  context: ExtensionContext
  kernel: Kernel
  notebookToolbarCommand: {
    ui: boolean
    notebookEditor: {
      notebookUri: Uri
    }
  }
}

export enum APIMethod {
  CreateCellExecution = 'createCellExecution',
  UpdateCellExecution = 'updateCellExecution',
}

export interface IApiMessage<T extends ClientMessage<ClientMessages>> {
  messaging: NotebookRendererMessaging
  message: T
  editor: NotebookEditor
}

export type ShellType = 'sh' | 'powershell' | 'cmd' | 'fish'

export type ActiveTerminal = RunmeTerminal & { executionId: number; runmeId: string }

export enum NotebookAutoSaveSetting {
  Yes = 'yes',
  No = 'no',
}

export enum SnapshotEnvSpecName {
  Secret = 'Secret',
  Password = 'Password',
  Opaque = 'Opaque',
  Plain = 'Plain',
}

export type SnapshotEnv = MonitorEnvResponseSnapshot_SnapshotEnv & StringIndexable
