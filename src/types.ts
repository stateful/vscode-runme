import { OutputType, ClientMessages } from './constants'

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
