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

export function closeOutput({ uuid, outputType }: { uuid: string, outputType: OutputType }) {
  const ctx = getContext()
  ctx.postMessage && postClientMessage(ctx, ClientMessages.closeCellOutput, {
    uuid,
    outputType
  })
}