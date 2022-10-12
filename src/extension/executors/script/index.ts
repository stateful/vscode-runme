import react from './renderer/react'
import preact from './renderer/preact'
import vue from './renderer/vue'
import svelte from './renderer/svelte'
import lit from './renderer/basic'

const templates = { react, vue, svelte, lit, preact } as const

export default function render (type: keyof typeof templates, code: string, filename: string) {
  const renderer = templates[type || 'lit']

  if (!renderer) {
    return /*html*/`No renderer found for "${type}"`
  }

  return renderer(code, filename)
}

export const SUPPORTED_FRAMEWORKS = Object.keys(templates) as any as keyof typeof templates
