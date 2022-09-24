export interface ParsedReadmeEntry {
  name: string
  content: string
  description: string
  executable: string
  lines: string[]
}

export interface StdoutOutput {
  output: string
}
