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
          const outputItemElem = document.createElement('shell-output-items')
          outputItemElem.setAttribute('content', content)
          element.appendChild(outputItemElem)
          break
        case OutputType.annotations:
          const annoElem = document.createElement('edit-annotations')
          annoElem.setAttribute('annotations', JSON.stringify(payload.output.annotations ?? []))
          annoElem.setAttribute('validationErrors', JSON.stringify(payload.output.validationErrors ?? []))
          element.appendChild(annoElem)
          break
        case OutputType.terminal:
          const terminalElement = document.createElement('terminal-view')
          terminalElement.setAttribute('uuid', payload.output['runme.dev/uuid'])
          terminalElement.setAttribute('terminalFontFamily', payload.output.terminalFontFamily)
          terminalElement.setAttribute('terminalFontSize', payload.output.terminalFontSize.toString())

          if (payload.output.initialRows !== undefined) {
            terminalElement.setAttribute('initialRows', payload.output.initialRows.toString())
          }

          if (payload.output.content !== undefined) {
            terminalElement.setAttribute('initialContent', payload.output.content)
          }

          element.appendChild(terminalElement)
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
