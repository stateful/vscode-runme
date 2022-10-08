import react from './react.tpl'
import vue from './vue.tpl'
import svelte from './svelte.tpl'

const templates = { react, vue, svelte } as const

export default function render (type: keyof typeof templates, code: string, filename: string) {
  const renderer = templates[type]

  if (!renderer) {
    return /*html*/`No renderer found for "${type}"`
  }

  return renderer(code, filename)
}

export const SUPPORTED_FRAMEWORKS = Object.keys(templates) as any as keyof typeof templates
