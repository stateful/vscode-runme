import react from './renderer/react'
import preact from './renderer/preact'
import vue from './renderer/vue'
import svelte from './renderer/svelte'
import ts from './renderer/ts'
import lit from './renderer/basic'

const templates = { react, vue, svelte, lit, preact, ts } as const

export default function render (
  type: keyof typeof templates,
  code: string,
  filename: string,
  attributes: Record<string, string>
) {
  const renderer = templates[type || 'lit'] || templates.lit
  return renderer(code, filename, attributes)
}

export const SUPPORTED_FRAMEWORKS = Object.keys(templates) as any as keyof typeof templates
