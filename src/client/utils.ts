import type { RendererContext } from 'vscode-notebook-renderer'

import { postClientMessage } from '../utils/messaging'
import { ClientMessages, OutputType } from '../constants'

let context: RendererContext<void> | undefined

export function getContext() {
  if (!context) {
    throw new Error('Renderer context not defined')
  }
  return context
}

export function setContext(c: RendererContext<void>) {
  context = c
}

export function closeOutput({ id, outputType }: { id: string; outputType: OutputType }) {
  const ctx = getContext()
  ctx.postMessage &&
    postClientMessage(ctx, ClientMessages.closeCellOutput, {
      id,
      outputType,
    })
}

export function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}
