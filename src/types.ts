import { OutputType, ClientMessages } from './constants'

export interface ParsedReadmeEntry {
  /**
   * name identified by the Runme CLI, e.g. "echo-hello"
   */
  name?: string
  /**
   * code block as string
   */
  content: string
  /**
   * annotated code langauge by the user
   */
  language?: string
  /**
   * code lines of block stripped from whitespaces
   */
  lines: string[]
  /**
   * custom attributes to the code block, e.g.:
   *
   * ```js { interactive=false }
   * ...
   * ```
   */
  attributes?: Metadata
  /**
   * markdown content if section is not a code block
   */
  markdown?: string
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
  project?: any
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
