import { OutputType, DenoMessages } from './constants'

export interface ParsedReadmeEntry {
  name?: string
  content?: string
  description?: string
  markdown?: string
  language?: string
  lines?: string[]
  attributes?: Metadata
}

export interface ParsedDocument {
  document?: ParsedReadmeEntry[]
}

export interface Metadata {
  [key: string]: any
}

export interface CellOutput<T extends OutputType> {
  type: T
  output: Payload[T]
}

interface DenoPayload {
  deployed?: boolean
  project?: string
  deployments?: any[]
}

interface Payload {
  [OutputType.error]: string
  [OutputType.shell]: string
  [OutputType.deno]?: DenoPayload
  [OutputType.html]: {
    isSvelte: boolean
    content: string
    port: number
  }
  [OutputType.script]: {
    filename: string
    port: number
  }
  [OutputType.vercel]: {
    type: string
    payload: any
  }
}

export interface DenoMessage <T extends DenoMessages> {
  type: T
  output: DenoMessagePayload[T]
}
export interface DenoMessagePayload {
  [DenoMessages.deployed]: boolean
  [DenoMessages.update]: DenoPayload
  [DenoMessages.promote]: {
    id: string
    productionDeployment: string
  }
}
