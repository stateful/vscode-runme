import { OutputType, ClientMessages } from './constants'

export namespace WasmLib {
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
