import type { RendererContext } from 'vscode-notebook-renderer'

let context: RendererContext<string | void>

export function getContext () {
  if (!context) {
    throw new Error('Renderer context not defined')
  }
  return context
}

export function setContext (c: RendererContext<string | void>) {
  context = c
}