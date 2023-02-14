import type { RendererContext } from 'vscode-notebook-renderer'

let context: RendererContext<void> | undefined

export function getContext () {
  if (!context) {
    throw new Error('Renderer context not defined')
  }
  return context
}

export function setContext (c: RendererContext<void>) {
  context = c
}

export function tryBoolean(element: string) {
  if (element.toLowerCase() === 'false') { return false }
  if (element.toLowerCase() === 'true') { return true }
  return element
}
