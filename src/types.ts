import { NotebookCellKind, TaskDefinition, type Terminal, TerminalDimensions } from 'vscode'
import { z } from 'zod'

import { OutputType, ClientMessages } from './constants'
import { SafeCellAnnotationsSchema } from './schema'
import type { IRunnerProgramSession } from './extension/runner'

export namespace Serializer {
  export type Notebook = {
    cells: Cell[]
    metadata?: Metadata
  }

  type TextPosition = number

  export type TextRange = {
    start: TextPosition
    end: TextPosition
  }

  export type Cell = {
    metadata?: Metadata
    languageId?: string
    value: string
    textRange?: Serializer.TextRange
    kind: NotebookCellKind.Markup | NotebookCellKind.Code
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
    ['runme.dev/name']?: string
    ['runme.dev/uuid']?: string
    ['runme.dev/denoState']?: DenoState
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
}

interface Payload {
  [OutputType.error]: string
  [OutputType.deno]?: DenoState
  [OutputType.vercel]: {
    type: string
    payload?: any
    outputItems: string[]
  }
  [OutputType.outputItems]: OutputItemsPayload
  [OutputType.annotations]: {
    annotations?: CellAnnotations
    validationErrors?: CellAnnotationsErrorResult
  }
  [OutputType.terminal]: {
    ['runme.dev/uuid']: string
    terminalFontFamily: string
    terminalFontSize: number
    content?: string
    initialRows?: number
  }
}

export type ClientMessage <T extends ClientMessages> = T extends any ? {
  type: T
  output: ClientMessagePayload[T]
} : never
export interface ClientMessagePayload {
  [ClientMessages.denoUpdate]: DenoState
  [ClientMessages.denoPromote]: {
    id: string
    productionDeployment: string
  }
  [ClientMessages.prod]: {
    cellIndex: number
  }
  [ClientMessages.mutateAnnotations]: {
    annotations: CellAnnotations
  }
  [ClientMessages.infoMessage]: string
  [ClientMessages.errorMessage]: string
  [ClientMessages.terminalStdout]: {
    ['runme.dev/uuid']: string
    data: Uint8Array|string
  }
  [ClientMessages.terminalStderr]: {
    ['runme.dev/uuid']: string
    data: Uint8Array|string
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
}

export interface OutputItemsPayload {
  content: string
  mime: string
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
