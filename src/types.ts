import { NotebookCellKind } from 'vscode'

import { OutputType, ClientMessages } from './constants'

export namespace WasmLib {
  export namespace New {
    export type Notebook = {
      cells: Cell[]
    }

    export type Cell = {
      metadata?: Attribute
      languageId?: string
      value: string
      kind: NotebookCellKind.Markup
    } | {
      metadata?: Attribute
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
  }

  export interface Runme {
    Runme: {
      initialize: (source: string) => void
      getCell: () => Cell
      getCells: () => Cells
      getSource: () => string
      updateCell: (id: number, md: string) => Error | null
      prepareScript: (lines: string[]) => string
    }
  }
  export type Cell = {
    editable: boolean
    source: string
    type: 'markdown'
  } | {
    attributes?: Attribute
    editable: boolean
    executable?: string
    lines?: string[]
    name: string
    source: string
    type: 'code'
  }

  export interface Cells {
    cells?: Cell[]
  }

  export interface Attribute {
    [key: string]: any
  }
}

export interface CellOutput<T extends OutputType> {
  type: T
  output: Payload[T]
}

interface DenoPayload {
  deployed?: boolean
  project?: any
  deployments?: any[]
}

interface Payload {
  [OutputType.error]: string
  [OutputType.shell]: string
  [OutputType.deno]?: DenoPayload
  [OutputType.vercel]: {
    type: string
    payload?: any
    outputItems: string[]
  }
  [OutputType.outputItems]: string
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
