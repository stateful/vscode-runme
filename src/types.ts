import { NotebookCellKind } from 'vscode'

import { OutputType, ClientMessages } from './constants'

export namespace WasmLib {
  export type Notebook = {
    cells: Cell[]
    metadata?: Metadata
  }

  export type Cell = {
    metadata?: Metadata
    languageId?: string
    value: string
    kind: NotebookCellKind.Markup
  } | {
    metadata?: Metadata
    languageId?: string
    value: string
    kind: NotebookCellKind.Code
  }

  export interface Serializer {
    Runme: {
      deserialize: (content: string) => Promise<Notebook>
      serialize: (content: string) => Promise<string>
    }
  }

  export interface Metadata {
    background?: string
    interactive?: string
    closeTerminalOnSuccess?: string
    mimeType?: string
    ['runme.dev/name']?: string
  }
}

interface ICellOutput<T extends OutputType> {
  type: T
  output: Payload[T]
}

export type CellOutputPayload<T extends OutputType> = T extends any
    ? ICellOutput<T>
    : never

export type CellOutput = CellOutputPayload<OutputType>

interface DenoPayload {
  deployed?: boolean
  project?: any
  deployments?: any[]
}

interface Payload {
  [OutputType.error]: string
  [OutputType.deno]?: DenoPayload
  [OutputType.vercel]: {
    type: string
    payload?: any
    outputItems: string[]
  }
  [OutputType.outputItems]: OutputItemsPayload
}

export interface ClientMessage <T extends ClientMessages> {
  type: T
  output: ClientMessagePayload[T]
}
export interface ClientMessagePayload {
  [ClientMessages.deployed]: boolean
  [ClientMessages.update]: DenoPayload
  [ClientMessages.promote]: {
    id: string
    productionDeployment: string
  }
  [ClientMessages.prod]: {
    cellIndex: number
  }
  [ClientMessages.infoMessage]: string
  [ClientMessages.errorMessage]: string
}

export interface OutputItemsPayload {
  content: string
  mime: string
}

export interface RunmeTaskDefinition {
  type: 'runme'
  filePath: string
  command: string
  isBackground?: boolean
  closeTerminalOnSuccess?: boolean
  cwd?: string
}

export interface NotebookCellMetadata {
  background: boolean
  interactive: boolean
  closeTerminalOnSuccess: boolean
  mimeType: string
  name: string
}
