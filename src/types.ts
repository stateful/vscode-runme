export interface ParsedReadmeEntry {
  name: string
  content: string
  description: string
  executable: string
  lines: string[]
}

export interface CellOutput {
  type: 'error' | 'stateful.runme/shell-stdout' | 'stateful.runme/vercel-stdout' | 'stateful.runme/html-stdout'
  output: any
}
