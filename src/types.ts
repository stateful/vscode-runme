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

export type OutputTypes = (
  'error' |
  'stateful.runme/script-stdout' |
  'stateful.runme/shell-stdout' |
  'stateful.runme/vercel-stdout' |
  'stateful.runme/deno-stdout' |
  'stateful.runme/html-stdout'
)
export interface CellOutput {
  type: OutputTypes
  output: any
}
