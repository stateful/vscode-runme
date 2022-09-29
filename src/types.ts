export interface ParsedReadmeEntry {
  name?: string
  content?: string
  description?: string
  markdown?: string
  language?: string
  lines?: string[]
}

export interface CellOutput {
  type: 'error' | 'stateful.runme/shell-stdout' | 'stateful.runme/vercel-stdout' | 'stateful.runme/html-stdout'
  output: any
}
