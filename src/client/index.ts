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
      const payload: CellOutput<OutputType> = outputItem.json()

      switch (payload.type) {
        case OutputType.shell:
          const shellElem = document.createElement('shell-output')
          shellElem.innerHTML = payload.output as CellOutput<OutputType.shell>['output']
          element.appendChild(shellElem)
          break
        case OutputType.vercel:
          const vercelElem = document.createElement('vercel-output')
          vercelElem.setAttribute('content', JSON.stringify(payload.output))
          element.appendChild(vercelElem)
          break
        case OutputType.deno:
          const deno = payload.output as CellOutput<OutputType.deno>['output'] || {}
          const denoElem = document.createElement('deno-output')
          deno.deployed && denoElem.setAttribute('deployed', deno.deployed.toString())
          deno.project && denoElem.setAttribute('project', JSON.stringify(deno.project))
          denoElem.setAttribute('deployments', JSON.stringify(deno.deployments))
          element.appendChild(denoElem)
          break
        case OutputType.html:
          const html = payload.output as CellOutput<OutputType.html>['output']
          const tag = html.isSvelte ? 'svelte-component' : 'vite-payload.output'
          const viteElem = document.createElement(tag)
          viteElem.setAttribute('content', html.content)
          viteElem.setAttribute('port', html.port.toString())
          element.appendChild(viteElem)
          break
        case OutputType.script:
          const script = payload.output as CellOutput<OutputType.script>['output']
          const iframe = document.createElement('iframe')
          const iframeSrc = `http://localhost:${script.port}/${script.filename}`
          iframe.setAttribute('src', iframeSrc)
          iframe.setAttribute('style', 'width: 100%; border: 0; height: 400px;')
          element.appendChild(iframe)
          break
        case OutputType.outputItems:
          const outputItemElem = document.createElement('shell-output-items')
          outputItemElem.setAttribute('content', payload.output as string)
          element.appendChild(outputItemElem)
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
