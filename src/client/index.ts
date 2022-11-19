import type { ActivationFunction, RendererContext } from 'vscode-notebook-renderer'

import { OutputType } from '../constants'
import type { CellOutput } from '../types'

import { setContext } from './utils'
import './components'

// ----------------------------------------------------------------------------
// This is the entrypoint to the notebook renderer's webview client-side code.
// This contains some boilerplate that calls the `render()` function when new
// output is available. You probably don't need to change this code; put your
// rendering logic inside of the `render()` function.
// ----------------------------------------------------------------------------

export const activate: ActivationFunction = (context: RendererContext<void>) => {
  setContext(context)
  return {
    renderOutputItem(outputItem, element) {
      const payload: CellOutput = outputItem.json()

      switch (payload.type) {
        case OutputType.vercel:
          const vercelElem = document.createElement('vercel-output')
          vercelElem.setAttribute('content', JSON.stringify(payload.output))
          element.appendChild(vercelElem)
          break
        case OutputType.deno:
          const deno = payload.output || {}
          const denoElem = document.createElement('deno-output')
          deno.deployed && denoElem.setAttribute('deployed', deno.deployed.toString())
          deno.project && denoElem.setAttribute('project', JSON.stringify(deno.project))
          denoElem.setAttribute('deployments', JSON.stringify(deno.deployments))
          element.appendChild(denoElem)
          break
        case OutputType.outputItems:
          let outputItemElem: any

          if (payload.output.mime.startsWith('image/')) {
            outputItemElem = document.createElement('img') as HTMLImageElement
            outputItemElem.src = `data:${payload.output.mime};base64, ${payload.output.content}`
            element.appendChild(outputItemElem)
          } else {
            const content = decodeURIComponent(escape(window.atob(payload.output.content)))
            /**
             * shell output
             */
            const shellElem = document.createElement('shell-output')
            shellElem.innerHTML = content
            element.appendChild(shellElem)
            /**
             * output items, e.g. copy to clipboard
             */
            outputItemElem = document.createElement('shell-output-items')
            outputItemElem.setAttribute('content', content)
            element.appendChild(outputItemElem)
          }
          break
        case OutputType.error:
          element.innerHTML = `⚠️ ${payload.output}`
          break
        default: element.innerHTML = 'No renderer found!'
      }
    },
    disposeOutputItem(/* outputId */) {
      // Do any teardown here. outputId is the cell output being deleted, or
      // undefined if we're clearing all outputs.
    }
  }
}
