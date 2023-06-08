import {
  NotebookCellKind,
  TaskDefinition,
  type Terminal,
  TerminalDimensions,
  Uri,
  ExtensionContext,
  NotebookRendererMessaging,
  NotebookEditor
} from 'vscode'
import { z } from 'zod'

import { OutputType, ClientMessages } from './constants'
import { SafeCellAnnotationsSchema } from './schema'
import type { IRunnerProgramSession } from './extension/runner'
import type * as Grpc from './extension/grpc/serializerTypes'
import { IWorkflowRun } from './extension/services/types'
import { Kernel } from './extension/kernel'

export namespace Serializer {
  export type Notebook = {
    cells: Cell[]
    metadata?: Metadata
    frontmatter?: Grpc.Frontmatter
  }

  export type Cell = Omit<Grpc.Cell, 'kind' | 'metadata' | 'languageId'> & {
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
    name?: string
    background?: string
    interactive?: string
    closeTerminalOnSuccess?: string
    mimeType?: string
    promptEnv?: string
    ['runme.dev/name']?: string
    ['runme.dev/uuid']?: string
    ['runme.dev/denoState']?: DenoState
    ['runme.dev/vercelState']?: VercelState
    ['runme.dev/githubState']?: GitHubState
    ['runme.dev/frontmatterParsed']?: Grpc.Frontmatter
    ['runme.dev/textRange']?: Grpc.Cell['textRange']
  }
}

export interface ICellOutput<T extends OutputType> {
  type: T
  output: Payload[T]
}

export type CellOutputPayload<T extends OutputType> = T extends any
  ? ICellOutput<T>
  : never

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

interface Payload {
  [OutputType.error]: string
  [OutputType.deno]?: DenoState
  [OutputType.vercel]: VercelState
  [OutputType.outputItems]: OutputItemsPayload
  [OutputType.annotations]: {
    annotations?: CellAnnotations
    validationErrors?: CellAnnotationsErrorResult
    uuid?: string
  }
  [OutputType.terminal]: {
    ['runme.dev/uuid']: string
    terminalFontFamily: string
    terminalFontSize: number
    content?: string
    initialRows?: number
    annotations: CellAnnotations
    input: string
    enableShareButton: boolean
  }
  [OutputType.github]?: GitHubState
}

export type ClientMessage<T extends ClientMessages> = T extends any ? {
  type: T
  output: ClientMessagePayload[T]
} : never
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
    ['runme.dev/uuid']: string
    data: Uint8Array | string
  }
  [ClientMessages.terminalStderr]: {
    ['runme.dev/uuid']: string
    data: Uint8Array | string
  }
  [ClientMessages.terminalStdin]: {
    ['runme.dev/uuid']: string
    input: string
  }
  [ClientMessages.terminalFocus]: { ['runme.dev/uuid']: string }
  [ClientMessages.terminalResize]: {
    ['runme.dev/uuid']: string
    terminalDimensions: TerminalDimensions
  }
  [ClientMessages.terminalOpen]: {
    ['runme.dev/uuid']: string
    terminalDimensions?: TerminalDimensions
  }
  [ClientMessages.activeThemeChanged]: string
  [ClientMessages.openLink]: string
  [ClientMessages.closeCellOutput]: {
    uuid: string
    outputType: OutputType
  }
  [ClientMessages.displayPrompt]: {
    placeholder: string
    isSecret: boolean
    title: string
    uuid: string
  }
  [ClientMessages.onPrompt]: {
    answer: string | undefined
    uuid: string
  }
  [ClientMessages.onPickerOption]: {
    option: string | undefined
    uuid: string
  }
  [ClientMessages.displayPicker]: {
    options: string[]
    title: string
    uuid: string
  }
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
    uuid: string
  }
  [ClientMessages.getState]: {
    state: string
    uuid: string
  }
  [ClientMessages.onGetState]: {
    state: string
    value: string | string[]
    uuid: string
  }
  [ClientMessages.apiRequest]: {
    data: any
    uuid: string
    hasErrors?: boolean
    method: APIMethod
  }
  [ClientMessages.apiResponse]: {
    data: any
    uuid: string
    hasErrors?: boolean
  }
  [ClientMessages.optionsMessage]: {
    title: string
    uuid: string
    options: any[]
  }
  [ClientMessages.onOptionsMessage]: {
    uuid: string
    option: string | undefined
  }
  [ClientMessages.openExternalLink]: string
  [ClientMessages.copyTextToClipboard]: {
    uuid: string
    text: string
  }
  [ClientMessages.onCopyTextToClipboard]: {
    uuid: string
  }
}

export interface OutputItemsPayload {
  content: string
  mime: string
  uuid: string
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
  CreateCellExecution = 'createCellExecution'
}

export interface IApiMessage<T extends ClientMessage<ClientMessages>> {
  messaging: NotebookRendererMessaging
  message: T
  editor: NotebookEditor
}
